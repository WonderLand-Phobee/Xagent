"""Public official pages only. Robots-aware, no browser/anti-bot bypass.

JSON-LD adapter is deliberately fail-closed. A future validThrough alone does
not prove active recruitment. Unknown markup is quarantined for adapter review.
"""
import json
import re
import time
import urllib.error
import urllib.request
import urllib.robotparser
from datetime import datetime
from urllib.parse import urlparse, urljoin
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from .core import HOSTS, job_id, clean, UNKNOWN

AGENT = 'OfferTodayContentDesk/1.0'

class SourceError(Exception):
    pass

class Client:
    def __init__(self, delay=2.0):
        self.robots = {}
        self.delay = delay
        self.last = 0
        self.audit = []
        self.deadline = time.monotonic() + 900

    def raw(self, url):
        p = urlparse(url)
        if p.scheme != 'https' or p.hostname not in HOSTS or p.username or p.password or p.port:
            raise SourceError('Non-official URL refused')
        pause = max(0, self.delay - (time.monotonic()-self.last))
        if time.monotonic()+pause+25 > self.deadline:
            raise SourceError('Run request budget exhausted')
        time.sleep(pause)
        # Refuse every cross-host redirect instead of requesting an unapproved destination.
        class Redirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                if urlparse(newurl).netloc != urlparse(req.full_url).netloc or urlparse(newurl).scheme != 'https':
                    raise SourceError('Cross-host redirect requires explicit review')
                return super().redirect_request(req, fp, code, msg, headers, newurl)
        self.last = time.monotonic()
        req = urllib.request.Request(url, headers={'User-Agent':AGENT, 'Accept':'text/html,application/xml,application/json'})
        try:
            with urllib.request.build_opener(Redirect()).open(req, timeout=25) as response:
                body = response.read(3_000_001)
                if len(body)>3_000_000:
                    raise SourceError('Response size exceeds safe limit')
                self.audit.append({'url':url, 'status':response.status})
                return body.decode('utf-8')
        except (urllib.error.URLError, UnicodeError, ValueError) as e:
            raise SourceError(f'Official page unavailable: {type(e).__name__}') from e

    def get(self, url):
        p = urlparse(url)
        origin = f'{p.scheme}://{p.netloc}'
        if origin not in self.robots:
            robots = self.raw(origin+'/robots.txt')  # Fail closed, including HTTP 404/403.
            parser = urllib.robotparser.RobotFileParser()
            parser.parse(robots.splitlines())
            self.robots[origin] = parser
        parser = self.robots[origin]
        if not parser.can_fetch(AGENT, url):
            raise SourceError('Disallowed by robots.txt')
        self.delay = max(self.delay, parser.crawl_delay(AGENT) or 0)
        return self.raw(url)

    def discover(self, seeds, limit=80):
        urls = list(dict.fromkeys(u for u in seeds if job_id(u)))
        # Only sitemap locations actually declared by the official robots file.
        origin = 'https://www.offertoday.com'
        self.get(origin+'/')
        sitemaps = self.robots[origin].site_maps() or []
        pending = list(sitemaps)
        visited = set()
        while pending and len(visited)<8 and len(urls)<limit:
            url = pending.pop(0)
            if url in visited:
                continue
            visited.add(url)
            root = ET.fromstring(self.get(url))
            locations = [e.text for e in root.iter() if e.tag.endswith('}loc') or e.tag == 'loc']
            if root.tag.endswith('sitemapindex'):
                pending.extend(u for u in locations if u and urlparse(u).hostname in HOSTS)
            else:
                urls.extend(u for u in locations if u and job_id(u) and u not in urls)
        return urls[:limit]

def walk(value):
    if isinstance(value, dict):
        yield value
        for v in value.values():
            yield from walk(v)
    elif isinstance(value, list):
        for v in value:
            yield from walk(v)

def parse_detail(url, body, now):
    soup = BeautifulSoup(body, 'html.parser')
    postings = []
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            postings.extend(x for x in walk(json.loads(script.get_text())) if 'JobPosting' in ([x.get('@type')] if isinstance(x.get('@type'), str) else x.get('@type', [])))
        except (ValueError, TypeError):
            continue
    unknown = dict(jobUrl=url, jobTitle='Unknown', jobStatus='Unverified', verifiedAt=now.isoformat())
    if len(postings) != 1:
        return unknown
    p = postings[0]
    # Reject mismatched canonical identity/language versions.
    for linked in [p.get('url'), (soup.select_one('link[rel="canonical"]') or {}).get('href')]:
        if linked and job_id(urljoin(url, linked)) != job_id(url):
            return {**unknown, 'jobTitle':clean(p.get('title')), 'parseWarning':'Canonical Job ID mismatch'}
    description = clean(p.get('description'))
    props = p.get('additionalProperty') or []
    props = props if isinstance(props, list) else [props]
    values = {str(x.get('name','')).casefold():str(x.get('value','')) for x in props if isinstance(x, dict)}
    explicit = values.get('jobstatus', '').casefold()
    status, evidence = 'Unverified', None
    if explicit in ('closed','expired','inactive'):
        status = 'Expired'
    try:
        end = datetime.fromisoformat(str(p.get('validThrough','')).replace('Z','+00:00'))
        if end.tzinfo is None:
            raise ValueError('Missing timezone')
        if end <= now:
            status = 'Expired'
        elif explicit in ('active','open'):
            status, evidence = 'Active', f'JobPosting jobStatus={explicit}; validThrough={end.isoformat()}'
    except ValueError:
        pass
    if re.search(r'\b(this (?:job|position) (?:has expired|is closed|is no longer available)|job expired|applications? closed)\b', soup.get_text(' ', strip=True), re.I):
        status, evidence = 'Expired', None
    salary = UNKNOWN
    s = p.get('baseSalary')
    if isinstance(s, dict) and s.get('currency') and isinstance(s.get('value'), dict):
        value = s['value']
        amount = value.get('value')
        if amount is None and value.get('minValue') is not None and value.get('maxValue') is not None:
            amount = f"{value['minValue']}–{value['maxValue']}"
        if amount is not None and value.get('unitText'):
            salary = f"{s['currency']} {amount} / {value['unitText']}"
    experience = clean(p.get('experienceRequirements')) if isinstance(p.get('experienceRequirements'), str) else UNKNOWN
    # Schema TELECOMMUTE alone does not establish remote geography. Quote explicit job property only.
    arrangement = values.get('workarrangement', UNKNOWN)
    parts = [clean(x.get_text(' ', strip=True)) for x in BeautifulSoup(p.get('description',''), 'html.parser').select('li')]
    if len(parts)<2:
        parts = re.split(r'(?<=[.!?])\s+', description)
    facts = [s for s in parts if len(s.split())>=4][:2]
    return dict(jobUrl=url, jobTitle=clean(p.get('title')), description=description, jobStatus=status,
                activeEvidence=evidence, verifiedAt=now.isoformat(), salary=salary,
                experience=experience or UNKNOWN, workArrangement=arrangement or UNKNOWN,
                highlights=facts, datePosted=str(p.get('datePosted') or ''))
