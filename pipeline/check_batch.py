"""Tell the browser when shared strict rules have twelve copy-ready jobs."""
import json
import sys
from datetime import datetime
from .browser import parse_browser_job
from .core import HK, build_day
if __name__=='__main__':
    now=datetime.now(HK)
    raw=json.load(sys.stdin)
    d=build_day([parse_browser_job(j,now) for j in raw],now.date().isoformat(),now,history={})
    print(json.dumps({'eligible':len(d['posts']),'copyReady':sum(bool(p['xCopy']) for p in d['posts'])}))
