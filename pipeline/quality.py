"""Compare explicit pay statements; never invent currency, unit or conversions."""
import re
CURRENCY=r'(?:HK\s*\$|HKD|US\s*\$|USD|GBP|EUR|CNY|RMB|AUD|CAD)'
AMOUNT=r'\d[\d,]*(?:\.\d+)?\s*(?:[KM](?=\b|/|[-–]))?'

def currency(token):
    token=re.sub(r'\s+','',token).upper()
    return {'HK$':'HKD','US$':'USD','RMB':'CNY'}.get(token,token)

def number(token):
    token=re.sub(r'[,\s]','',token).upper()
    multiplier=1000 if token.endswith('K') else 1000000 if token.endswith('M') else 1
    return float(token.rstrip('KM'))*multiplier

def unit(text):
    m=re.search(r'(?:/\s*|per\s+)(month|year|week|day|hour)\b',text,re.I)
    return m[1].lower() if m else None

def conflicting_salary(summary, description):
    main=re.search(fr'({CURRENCY})\s*({AMOUNT})(?:\s*[-–]\s*(?:{CURRENCY})?\s*({AMOUNT}))?',summary,re.I)
    if not main:return False
    low=number(main[2]);high=number(main[3]) if main[3] else low
    for m in re.finditer(fr'\b(?:salary|pay|compensation|remuneration)\b([^.!?\n]{{0,65}}?)({CURRENCY})\s*({AMOUNT})',description,re.I):
        if re.search(r'bonus|allowance|equity|stock',m[1],re.I):continue
        if currency(m[2])!=currency(main[1]):continue # Different currencies cannot be compared without assumptions.
        jd_unit=unit(description[m.end():m.end()+25]);summary_unit=unit(summary)
        if jd_unit and summary_unit and jd_unit!=summary_unit:continue # Never convert annual/monthly figures implicitly.
        amount=number(m[3])
        if not min(low,high)<=amount<=max(low,high):return True
    return False
