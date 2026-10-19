"""Conservative eligibility rules. No inferred salary, arrangement, or active status."""
import hashlib
import html
import re
from datetime import datetime
from urllib.parse import urlparse, unquote
from zoneinfo import ZoneInfo
import regex
from bs4 import BeautifulSoup
from langdetect import detect, DetectorFactory

DetectorFactory.seed = 0
HK = ZoneInfo('Asia/Hong_Kong')
HOSTS = {'offertoday.com', 'www.offertoday.com', 'hk.offertoday.com'}
UNKNOWN = 'Not specified'

def job_id(url):
    try:
        p = urlparse(url)
        if p.scheme != 'https' or p.hostname not in HOSTS or p.username or p.password or p.port:
            return None
        m = re.fullmatch(r'/(?:en/)?job/([A-Za-z0-9_-]+)/*', p.path)
        return unquote(m[1]) if m else None
    except (ValueError, TypeError):
        return None

def clean(value):
    return BeautifulSoup(str(value or ''), 'html.parser').get_text(' ', strip=True)

def english_jd(text):
    # Reject substantive mixed JD, even if the language detector calls it English.
    if regex.search(r'\p{Han}|\p{Hiragana}|\p{Katakana}|\p{Hangul}', text):
        return False
    if len(re.findall(r'[A-Za-z]+', text)) < 25:
        return False
    try:
        return detect(text) == 'en'
    except Exception:
        return False

def category(title, description):
    # Title-scoped: merely mentioning a developer does not make a sales role Tech.
    if re.search(r'\b(design(?:er)?|creative|video|illustrat\w*|multimedia|producer|animat\w*|UX|UI)\b', title, re.I):
        return 'Design'
    if re.search(r'\b(developer|programmer|software|IT|data scientist|data analyst|BI developer|service desk|systems? analyst|devops|frontend|backend|full.stack|cloud engineer|network engineer|AI consultant|research engineer|security engineer)\b', title, re.I):
        return 'Tech'
    return None

def weighted_length(text):
    """X v3 weights; known direct URL is counted as a t.co URL (23)."""
    text = re.sub(r'https://[^\s]+', 'x' * 23, text)
    length = 0
    for cluster in regex.findall(r'\X', text):
        if regex.search(r'\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3', cluster):
            length += 2
        else:
            for c in cluster:
                n = ord(c)
                length += 1 if n <= 0x10FF or 0x2000 <= n <= 0x200D or 0x2010 <= n <= 0x201F or 0x2032 <= n <= 0x2037 else 2
    return length

def make_copy(job):
    emoji = '💻⚙️' if job['category'] == 'Tech' else '🎨✨'
    facts = job.get('highlights', [])[:2]
    if len(facts) != 2:
        return None
    def render(f):
        return (f"{emoji} 💰💰\nHiring: {job['jobTitle']}\nSalary: {job['salary']}\n"
                f"Experience: {job['experience']}\nWork Arrangement: {job['workArrangement']}\n"
                + '\n'.join('• ' + x for x in f) + '\n#HiringNow #JobOpening\n💞Learn more & apply: ' + job['jobUrl'])
    # Only shorten quoted JD facts, never invent abbreviations for job facts/title.
    for limit in [100, 70, 50, 35, 22, 12]:
        reduced = [x if len(x) <= limit else x[:limit].rsplit(' ', 1)[0].rstrip('.,;') + '…' for x in facts]
        result = render(reduced)
        if weighted_length(result) <= 280:
            return result
    return None

def validate(job, now):
    if not job_id(job.get('jobUrl', '')):
        return 'Link missing'
    if job.get('jobStatus') == 'Expired':
        return 'Expired'
    if job.get('jobStatus') != 'Active' or not job.get('activeEvidence'):
        return 'Unverified'
    try:
        checked = datetime.fromisoformat(job['verifiedAt'])
        if checked.tzinfo is None or checked.astimezone(HK).date() != now.astimezone(HK).date() or abs((now-checked).total_seconds()) > 7200:
            return 'Unverified'
    except (KeyError, TypeError, ValueError):
        return 'Unverified'
    if not english_jd(job.get('description', '')):
        return 'Chinese JD' if regex.search(r'\p{Han}', job.get('description', '')) else 'Non-English or insufficient JD'
    if not category(job.get('jobTitle', ''), job.get('description', '')):
        return 'Out of scope'
    return None

def build_day(jobs, date, now, history, previous=None, errors=None):
    posts, excluded, seen = [], [], set()
    prior = {p['jobId']: p for p in (previous or {}).get('posts', [])}
    jobs = sorted(jobs, key=lambda j: (j.get('workArrangement') in ['Remote', 'Hybrid', 'Freelance'], j.get('datePosted', '')), reverse=True)
    for raw in jobs:
        j = dict(raw)
        reason = validate(j, now)
        jid = job_id(j.get('jobUrl', ''))
        if not reason and jid in seen:
            reason = 'Duplicate same day'
        if reason:
            excluded.append({'jobId': jid, 'jobUrl': j.get('jobUrl', ''), 'jobTitle': j.get('jobTitle', 'Unknown'), 'reason': reason})
            continue
        seen.add(jid)
        j.update(jobId=jid, category=category(j['jobTitle'], j['description']), jdLanguage='English')
        for field in ['salary', 'experience', 'workArrangement']:
            j[field] = j.get(field) or UNKNOWN
        j['xCopy'] = make_copy(j)
        j['xCopy'] = j['xCopy'] or ''  # Optional draft never gates an eligible job.
        j['contentHash'] = hashlib.sha256((j['xCopy'] + j['description']).encode()).hexdigest()
        past = sorted(d for d, day in history.items() if d < date and any(p['jobId'] == jid for p in day.get('posts', [])))
        j.update(repeatRecommendation=bool(past), lastRecommendedDate=past[-1] if past else None,
                 recommendationCount=len(past)+1,
                 account='OfferToday-TechJobs' if j['category'] == 'Tech' else 'OfferToday-DesignJobs')
        posts.append(j)
    # Retain same-day slots for still-eligible jobs, then fill vacancies. Never retain stale verification.
    posts.sort(key=lambda j: (j['jobId'] not in prior, prior.get(j['jobId'], {}).get('scheduledTime', '99:99')))
    posts = posts[:12]
    occupied = set()
    for j in posts:
        slot = prior.get(j['jobId'], {}).get('scheduledTime')
        if slot in [f'{h:02}:00' for h in range(11,23)] and slot not in occupied:
            j['scheduledTime'] = slot
            occupied.add(slot)
    for j in posts:
        if 'scheduledTime' not in j:
            j['scheduledTime'] = next(f'{h:02}:00' for h in range(11,23) if f'{h:02}:00' not in occupied)
            occupied.add(j['scheduledTime'])
    posts.sort(key=lambda j: j['scheduledTime'])
    status = 'blocked' if errors and not posts else 'partial' if len(posts) < 12 or errors else 'success'
    return dict(date=date, timezone='Asia/Hong_Kong', targetCount=12, lastRunAt=now.isoformat(),
                lastSuccessfulRunAt=now.isoformat() if not errors else (previous or {}).get('lastSuccessfulRunAt'),
                status=status, shortfall=12-len(posts), posts=posts, excludedCandidates=excluded, errors=errors or [], demo=False)
