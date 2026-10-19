from pipeline.quality import conflicting_salary
from pipeline.browser import parse_browser_job
from datetime import datetime
from pipeline.core import HK
NOW=datetime(2026,10,19,10,tzinfo=HK)
def test_observed_conflicting_official_salary_is_quarantined():
    j=parse_browser_job({'salaryRaw':'HK $2K-3K/Month','description':'Salary will be HK$23,000.'},NOW)
    assert j['qualityIssue']=='Conflicting salary'
def test_matching_explicit_pay_is_not_a_conflict():
    assert not conflicting_salary('HK $20K-30K/Month','Salary: HKD 23,000 per month.')
def test_different_explicit_units_are_not_compared_by_guessing():
    assert not conflicting_salary('HK $20K/Month','Salary is HKD 240,000 per year.')
def test_company_revenue_and_bonus_are_not_base_salary():
    assert not conflicting_salary('HK $20K/Month','Our company revenue is HKD 3,000,000. Bonus is HKD 12,000.')
def test_platform_no_limit_default_is_not_a_verified_requirement():
    assert parse_browser_job({'experience':'No experience limit','description':'Build software with our team.'},NOW)['experience']=='Not specified'
def test_literal_no_experience_requirement_is_retained():
    assert parse_browser_job({'experience':'No experience limit','description':'No prior experience is required.'},NOW)['experience']=='No prior experience is required'
