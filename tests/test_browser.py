from datetime import datetime
from pipeline.browser import parse_browser_job
from pipeline.core import HK
NOW=datetime(2026,10,19,10,tzinfo=HK)
def test_normal_response_fields_are_not_inferred():
    j=parse_browser_job({'jobTitle':'Engineer','salaryRaw':'20K-30K','jobTypeRaw':'Full Time','description':'Work with remote colleagues.'},NOW)
    assert j['salary']=='Not specified' and j['workArrangement']=='Not specified'
    assert j['jobStatus']=='Unverified' and not j['activeEvidence']
def test_verified_unit_and_remote_geography_preserved():
    j=parse_browser_job({'salaryRaw':'HK $20K-30K / Month','experience':'1 to 3 yrs exp',
        'description':'<p>Work arrangement: Remote (Hong Kong only)</p><ul><li>Build useful and accessible web interfaces.</li><li>Collaborate with our product design team.</li></ul>'},NOW)
    assert j['salary']=='HK $20K-30K / Month'
    assert j['workArrangement']=='Remote (Hong Kong only)'
    assert j['experience']=='1 to 3 yrs exp'
    assert len(j['highlights'])==2


def test_jd_requirement_overrides_a_conflicting_no_limit_summary():
    j=parse_browser_job({'experience':'No experience limit','description':'<p>Requirements:</p><ul><li>1-2 years of experience in IT Helpdesk support</li></ul>'},NOW)
    assert j['experience']=='1-2 years'

def test_company_age_does_not_become_candidate_experience():
    j=parse_browser_job({'description':'<p>20 years of experience serving banks.</p><p>Requirements:</p><p>Good communication skills.</p>'},NOW)
    assert j['experience']=='Not specified'
