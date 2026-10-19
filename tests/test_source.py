import json
from datetime import datetime
from pipeline.core import HK
from pipeline.source import parse_detail, Client, SourceError
import pytest

NOW=datetime(2026,10,19,10,tzinfo=HK)
URL='https://www.offertoday.com/en/job/fixture-id'

def html(**override):
    p={'@context':'https://schema.org','@type':'JobPosting','title':'Software Engineer',
       'description':'<ul><li>Build accessible interfaces for our customers.</li><li>Work with the design team.</li></ul>',
       'validThrough':'2026-12-01T00:00:00+08:00',
       'additionalProperty':[{'name':'jobStatus','value':'Active'}]}
    p.update(override)
    return '<script type="application/ld+json">'+json.dumps(p)+'</script>'

def test_positive_evidence_required():
    assert parse_detail(URL,html(),NOW)['jobStatus']=='Active'
    assert parse_detail(URL,html(additionalProperty=[]),NOW)['jobStatus']=='Unverified'
    assert parse_detail(URL,html(validThrough=None),NOW)['jobStatus']=='Unverified'

def test_expired_and_visible_closed():
    assert parse_detail(URL,html(validThrough='2020-01-01T00:00:00Z'),NOW)['jobStatus']=='Expired'
    assert parse_detail(URL,html()+'<p>This job has expired</p>',NOW)['jobStatus']=='Expired'

def test_explicit_closed_cannot_be_reopened_by_future_date():
    assert parse_detail(URL,html(additionalProperty=[{'name':'jobStatus','value':'Closed'}]),NOW)['jobStatus']=='Expired'

def test_pay_unit_required_and_unknown_arrangement():
    p=parse_detail(URL,html(baseSalary={'currency':'HKD','value':{'value':30000}}),NOW)
    assert p['salary']=='Not specified' and p['workArrangement']=='Not specified'
    p=parse_detail(URL,html(baseSalary={'currency':'HKD','value':{'value':30000,'unitText':'MONTH'}}),NOW)
    assert p['salary']=='HKD 30000 / MONTH'

def test_mismatched_identity_rejected():
    assert parse_detail(URL,html(url='https://www.offertoday.com/en/job/other'),NOW)['jobStatus']=='Unverified'

def test_unknown_js_page_quarantined():
    assert parse_detail(URL,'<div id="root"></div>',NOW)['jobStatus']=='Unverified'

def test_robots_failure_prevents_fetch(monkeypatch):
    client=Client(delay=0)
    calls=[]
    def raw(url):
        calls.append(url);raise SourceError('Unavailable')
    monkeypatch.setattr(client,'raw',raw)
    with pytest.raises(SourceError):client.get(URL)
    assert calls==['https://www.offertoday.com/robots.txt']
