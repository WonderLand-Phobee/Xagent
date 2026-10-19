"""Optional user-authorized daily reminder. No X publishing integration."""
import json
import os
import sys
import urllib.request
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from .core import HK


def notification(day, url, deployment_ok=True):
    p=urlparse(url)
    if p.scheme!='https' or not p.hostname or p.username or p.password:
        raise ValueError('DASHBOARD_URL must be a public HTTPS dashboard URL')
    count=len(day.get('posts',[]))
    if not deployment_ok:
        lead='Dashboard deployment failed. The fixed page may still show older data.'
    elif day.get('status') not in ('success','partial') or day.get('demo'):
        lead='Today’s collection is blocked. No live verified edition is available.'
    else:
        lead=f"{count}/12 verified jobs for {day['date']}; {12-count} unfilled places."
    return f'OfferToday daily page\n{lead}\nOpen: {url}\nChecked time: {day.get("lastRunAt") or "Not available"}\nAvailability may change. No posts are published automatically.'


def send(day, config=None, opener=urllib.request.urlopen):
    config=config or os.environ
    channel=config.get('REMINDER_CHANNEL','').lower()
    if not channel:
        print('Reminder not configured. No notification sent.')
        return False
    url=config.get('DASHBOARD_URL','')
    text=notification(day,url,config.get('DEPLOYMENT_OK','true')=='true')
    if channel=='email':
        key=config.get('RESEND_API_KEY','')
        recipient=config.get('REMINDER_TO','')
        if not key or not recipient:
            raise ValueError('Email reminder requires RESEND_API_KEY and REMINDER_TO in GitHub Secrets')
        req=urllib.request.Request('https://api.resend.com/emails',method='POST',
            headers={'Authorization':'Bearer '+key,'Content-Type':'application/json','User-Agent':'OfferTodayDaily/1.0'},
            data=json.dumps({'from':(config.get('REMINDER_FROM') or 'onboarding@resend.dev'),'to':[recipient],
                             'subject':f"OfferToday · {day.get('date','Daily update')}",'text':text}).encode())
    elif channel=='telegram':
        token=config.get('TELEGRAM_BOT_TOKEN','')
        chat=config.get('TELEGRAM_CHAT_ID','')
        if not token or not chat:
            raise ValueError('Telegram reminder requires bot token and chat ID in GitHub Secrets')
        req=urllib.request.Request('https://api.telegram.org/bot'+token+'/sendMessage',method='POST',
            headers={'Content-Type':'application/json'},data=json.dumps({'chat_id':chat,'text':text,'disable_web_page_preview':True}).encode())
    else:
        raise ValueError('REMINDER_CHANNEL must be email or telegram')
    try:
        with opener(req,timeout=20) as response:
            data=json.loads(response.read())
            if channel=='telegram' and not data.get('ok'):
                raise RuntimeError('Provider did not accept reminder')
            if channel=='email' and not data.get('id'):
                raise RuntimeError('Provider did not accept reminder')
    except Exception:
        # Do not log request URLs: Telegram uses the token in its URL.
        raise RuntimeError('Reminder delivery failed. Check provider settings and credentials; no secrets have been logged.') from None
    print('Reminder accepted by notification provider; inbox delivery is not guaranteed.')
    return True

if __name__=='__main__':
    date=datetime.now(HK).date().isoformat()
    path=Path('data/daily')/f'{date}.json'
    day=json.loads(path.read_text()) if path.exists() else {'date':date,'status':'blocked','posts':[]}
    try:
        send(day)
    except (ValueError,RuntimeError) as exc:
        print(str(exc),file=sys.stderr)
        sys.exit(1)
