"""Bridge to normal public browser navigation; no credentials or API replay."""
import json
import re
import subprocess
import os
import sys
import tempfile
from pathlib import Path
from bs4 import BeautifulSoup
from .core import clean, UNKNOWN
from .quality import conflicting_salary


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
    verified_mode=raw.get('workArrangementRaw')
    if isinstance(verified_mode,list):
        verified_mode=', '.join(x if isinstance(x,str) else str(x.get('name','')) if isinstance(x,dict) else '' for x in verified_mode)
    if isinstance(verified_mode,str) and re.search(r'\b(?:Remote|Hybrid|On.site|Freelance)\b',verified_mode,re.I):
        arrangement=clean(verified_mode)
    if mode:
        arrangement=mode[1].strip()
    elif re.search(r'\bFreelance\b',raw.get('jobTypeRaw') or '',re.I):
        arrangement=clean(raw['jobTypeRaw'])
    experience=clean(raw.get('experience')) or UNKNOWN
    if experience.casefold()=='no experience limit':
        experience=UNKNOWN # This platform default is not evidence of a JD requirement.
    explicit_no_experience=re.search(r'\bno\s+(?:(?:prior|previous|relevant)\s+)?experience\s+(?:is\s+)?(?:required|necessary)\b',description,re.I)
    if explicit_no_experience:
        experience=explicit_no_experience[0]
    lines=soup.get_text('\n',strip=True)
    section=re.search(r'(?im)^\s*(?:(?:job|key|essential|minimum)\s+)?(?:requirements|qualifications|what you bring)\s*:?\s*$',lines)
    if section:
        requirement=re.search(r'(?im)^\s*(?:[-•]\s*)?((?:(?:at least|minimum(?: of)?)\s+)?\d+\+?(?:\s*[-–]\s*\d+|\s+to\s+\d+)?\s*(?:years?|yrs?))\s*(?:of\s+)?(?:(?:relevant|working|professional|hands-on)\s+)*experience\b',lines[section.end():])
        if requirement:
            experience=requirement[1].strip()
    return dict(jobUrl=raw.get('jobUrl',''), sourceJobId=raw.get('sourceJobId'),jobTitle=raw.get('jobTitle','Unknown'),
                description=description, qualityIssue='Conflicting salary' if conflicting_salary(pay,description) else None, jobStatus=raw.get('jobStatus','Unverified'), activeEvidence=raw.get('activeEvidence'),
                verifiedAt=raw.get('verifiedAt') or now.isoformat(), salary=salary,
                experience=experience,workArrangement=arrangement,highlights=highlights)


def collect_live(root, seeds, now, pinned=None):
    with tempfile.TemporaryDirectory(prefix='offertoday-browser-') as folder:
        path=Path(folder)/'input.json'
        path.write_text(json.dumps({'seeds':seeds,'pinned':pinned or []}))
        result=subprocess.run(['node',str(root/'scripts/collect-live.mjs'),str(path)],cwd=root,capture_output=True,text=True,timeout=840,env={**os.environ,'OFFERTODAY_PYTHON':sys.executable})
        if result.returncode:
            # Chromium's normal TLS/launch errors are safe; do not emit cookie/header dumps.
            raise RuntimeError('Normal browser collection failed: '+result.stderr.strip()[:1200])
        output=json.loads(result.stdout)
    return [parse_browser_job(j,now) for j in output.get('jobs',[])],output.get('errors',[]),output.get('audit',[])
