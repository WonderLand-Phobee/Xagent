"""Bridge to normal public browser navigation; no credentials or API replay."""
import json
import re
import subprocess
import tempfile
from pathlib import Path
from bs4 import BeautifulSoup
from .core import clean, UNKNOWN


def parse_browser_job(raw, now):
    description=clean(raw.get('description'))
    soup=BeautifulSoup(raw.get('description') or '', 'html.parser')
    parts=[clean(x.get_text(' ',strip=True)) for x in soup.select('li')]
    if len(parts)<2:
        parts=[clean(x.get_text(' ',strip=True)) for x in soup.select('p')]
    if len(parts)<2:
        parts=re.split(r'(?<=[.!?])\s+|\n+',description)
    highlights=[x for x in parts if len(x.split())>=4][:2]
    # Quote a unit only when explicitly present; never assign a monthly unit by default.
    pay=clean(raw.get('salaryRaw'))
    salary=pay if re.search(r'(?:/\s*|per\s+)(?:month|hour|day|year|week)\b|月薪|年薪|時薪|日薪',pay,re.I) else UNKNOWN
    arrangement=UNKNOWN
    mode=re.search(r'(?im)^\s*Work(?:ing)? (?:arrangement|mode|style)\s*:\s*([^\n.]+)', BeautifulSoup(raw.get('description') or '', 'html.parser').get_text('\n'))
    if mode:
        arrangement=mode[1].strip()
    elif re.search(r'\bFreelance\b',raw.get('jobTypeRaw') or '',re.I):
        arrangement=clean(raw['jobTypeRaw'])
    return dict(jobUrl=raw.get('jobUrl',''), sourceJobId=raw.get('sourceJobId'),jobTitle=raw.get('jobTitle','Unknown'),
                description=description, jobStatus=raw.get('jobStatus','Unverified'), activeEvidence=raw.get('activeEvidence'),
                verifiedAt=raw.get('verifiedAt') or now.isoformat(), salary=salary,
                experience=clean(raw.get('experience')) or UNKNOWN,workArrangement=arrangement,highlights=highlights)


def collect_live(root, seeds, now):
    with tempfile.TemporaryDirectory(prefix='offertoday-browser-') as folder:
        path=Path(folder)/'input.json'
        path.write_text(json.dumps({'seeds':seeds}))
        result=subprocess.run(['node',str(root/'scripts/collect-live.mjs'),str(path)],cwd=root,capture_output=True,text=True,timeout=840)
        if result.returncode:
            # Chromium's normal TLS/launch errors are safe; do not emit cookie/header dumps.
            raise RuntimeError('Normal browser collection failed: '+result.stderr.strip()[:1200])
        output=json.loads(result.stdout)
    return [parse_browser_job(j,now) for j in output.get('jobs',[])],output.get('errors',[]),output.get('audit',[])
