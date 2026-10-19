import argparse
import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
from .core import HK, build_day

ROOT = Path(__file__).resolve().parents[1]

def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as f:
            json.dump(value, f, ensure_ascii=False, indent=2)
            f.write('\n')
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)

def load(path, fallback):
    return json.loads(path.read_text()) if path.exists() else fallback

def generate(root=ROOT, demo=False):
    now = datetime.now(HK)
    date = now.date().isoformat()
    output = root/'public/demo' if demo else root/'data'
    history = {p.stem:load(p,{}) for p in (output/'daily').glob('*.json')}
    previous = history.get(date)
    jobs, errors, audit = [], [], []
    if demo:
        # Reserved, non-working ID on an official domain; visibly DEMO and never published.
        from .demo import demo_jobs
        jobs = demo_jobs(now)
    elif os.getenv('OFFERTODAY_SOURCE_APPROVED', '').lower() != 'true':
        errors.append('Source approval required: review official terms and robots, then enable OFFERTODAY_SOURCE_APPROVED. No live jobs have been verified.')
    else:
        try:
            seeds = load(root/'data/candidates.json', [])
            if not isinstance(seeds, list) or any(not isinstance(u,str) for u in seeds):
                raise ValueError('candidates.json must be an array of official detail URLs')
        except (ValueError, OSError) as exc:
            seeds = []
            errors.append(f'Candidate configuration invalid: {exc}')
        # Revalidate all same-day slots and prior recommendations before considering reuse.
        seeds += [p['jobUrl'] for d in sorted(history, reverse=True) for p in history[d].get('posts', []) if not history[d].get('demo')]
        try:
            from .browser import collect_live
            jobs, browser_errors, audit = collect_live(root, list(dict.fromkeys(seeds)), now)
            errors.extend(browser_errors)
            if not jobs:
                errors.append('No official job records could be verified in the normal browser. Check source audit and access restrictions.')
        except Exception as exc:
            errors.append(f'Browser collection failed: {type(exc).__name__}: {exc}')
    day = build_day(jobs, date, now, history, previous, errors)
    day['demo'] = demo
    if demo:
        day['status'] = 'demo'
        day['errors'] = ['DEMO ONLY — fictional fixtures. Do not publish.']
    save(output/'daily'/f'{date}.json', day)
    history[date] = day
    save(output/'index.json', {'timezone':'Asia/Hong_Kong', 'dates':sorted(history,reverse=True), 'lastAttemptAt':now.isoformat(), 'latestDate':date})
    if not demo:
        # Public output contains facts, not raw HTML or authentication data.
        registry = {}
        for d in sorted(history):
            for p in history[d].get('posts', []):
                item = registry.setdefault(p['jobId'], {'jobUrl':p['jobUrl'], 'dates':[]})
                item['dates'].append(d)
        save(output/'jobs.json', registry)
        save(output/'audit'/date/f"{now.strftime('%H%M%S%f')}.json", {'runAt':now.isoformat(), 'requests':audit, 'errors':errors, 'eligible':len(day['posts']), 'excluded':len(day['excludedCandidates'])})
    print(f"{date}: {day['status']}; {len(day['posts'])}/12 eligible; {len(day['excludedCandidates'])} excluded")
    return day

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--demo', action='store_true')
    args = parser.parse_args()
    result = generate(demo=args.demo)
    # Persist failure health first, then retain a failing Actions result.
    raise SystemExit(2 if result['status']=='blocked' else 0)
