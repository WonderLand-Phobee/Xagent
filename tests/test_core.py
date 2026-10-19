from datetime import datetime, timedelta
import pytest
from pipeline.core import HK, build_day, job_id, weighted_length, make_copy
from pipeline.demo import demo_jobs

NOW=datetime(2026,10,19,10,tzinfo=HK)

def sample(**changes):
    job=demo_jobs(NOW)[0]
    job['jobTitle']='Software Engineer'
    job.update(changes)
    return job

def day(jobs,history=None,previous=None):
    return build_day(jobs,'2026-10-19',NOW,history or {},previous)

def test_active_english_including_cantonese():
    d=day([sample()])
    assert len(d['posts'])==1
    assert 'Cantonese' in d['posts'][0]['description']

@pytest.mark.parametrize('status', ['Expired','Unverified',None])
def test_closed_and_unknown_excluded(status):
    d=day([sample(jobStatus=status)])
    assert not d['posts']

@pytest.mark.parametrize('description', ['工作職責 負責軟件開發', sample()['description']+' 需要中文溝通能力'])
def test_chinese_and_mixed_excluded(description):
    d=day([sample(description=description)])
    assert not d['posts']
    assert d['excludedCandidates'][0]['reason']=='Chinese JD'

@pytest.mark.parametrize('url',['','https://evil.example/en/job/one','http://www.offertoday.com/en/job/one','https://www.offertoday.com.evil.example/en/job/one','https://user@www.offertoday.com/en/job/one','https://www.offertoday.com:444/en/job/one'])
def test_missing_or_unsafe_link(url):
    assert not day([sample(jobUrl=url)])['posts']

def test_duplicate_language_and_query_variants():
    a=sample(jobUrl='https://www.offertoday.com/en/job/abc?src=x')
    b=sample(jobUrl='https://www.offertoday.com/job/abc')
    d=day([a,b]);assert len(d['posts'])==1
    assert d['excludedCandidates'][0]['reason']=='Duplicate same day'

def test_same_title_different_ids():
    assert len(day([sample(jobUrl=f'https://www.offertoday.com/en/job/{i}') for i in range(2)])['posts'])==2

def test_cross_day_repeat_with_tracking():
    old=day([sample()]);old['date']='2026-10-18'
    p=day([sample()],{'2026-10-18':old})['posts'][0]
    assert p['repeatRecommendation']
    assert p['lastRecommendedDate']=='2026-10-18'
    assert p['recommendationCount']==2

def test_missing_fields_and_remote_never_inferred():
    p=day([sample(salary=None,experience=None,workArrangement=None,description=sample()['description']+' Enjoy flexible teamwork with remote colleagues.')])['posts'][0]
    assert all(p[f]=='Not specified' for f in ['salary','experience','workArrangement'])
    p=day([sample(workArrangement='Hybrid')])['posts'][0]
    assert 'Work Arrangement: Hybrid' in p['xCopy'] and 'Remote' not in p['xCopy']

def test_shortfall_never_filled():
    d=day([sample()]);assert len(d['posts'])==1 and d['shortfall']==11
    assert len({p['jobId'] for p in d['posts']})==1

def test_stale_rejected():
    assert not day([sample(verifiedAt=(NOW-timedelta(days=1)).isoformat())])['posts']

def test_missing_active_evidence_rejected():
    assert not day([sample(activeEvidence=None)])['posts']

def test_rerun_reverifies_and_preserves_slots():
    original=day([sample(jobUrl=f'https://www.offertoday.com/en/job/{i}') for i in range(3)])
    rerun=day([sample(jobUrl='https://www.offertoday.com/en/job/1')],previous=original)
    assert len(rerun['posts'])==1
    assert rerun['posts'][0]['scheduledTime']=='12:00'
    assert not rerun['posts'][0]['repeatRecommendation']

def test_tweet_limits_and_no_fake_facts():
    p=day([sample()])['posts'][0]
    assert weighted_length(p['xCopy'])<=280
    assert 'Hiring: Software Engineer' in p['xCopy']
    assert '#HiringNow #JobOpening' in p['xCopy']
    assert not make_copy({**p,'jobTitle':'A'*300})
    assert weighted_length('a https://www.offertoday.com/en/job/verylongidentifier')==25
    assert weighted_length('👨‍👩‍👧‍👦')==2

def test_out_of_scope_title():
    assert not day([sample(jobTitle='Sales Executive')])['posts']

def test_job_id_stable():
    assert job_id('https://hk.offertoday.com/en/job/Ab_12-3?lang=en')=='Ab_12-3'


def test_long_draft_never_removes_an_eligible_job():
    d=day([sample(jobTitle='Software Engineer '+'Specialist '*60)])
    assert len(d['posts'])==1 and d['posts'][0]['xCopy']==''


def test_observed_official_padded_ids_and_encoded_variants():
    assert job_id('https://www.offertoday.com/en/job/92ui3FMOje6VZNnag0b44g==')=='92ui3FMOje6VZNnag0b44g=='
    assert job_id('https://www.offertoday.com/en/job/92ui3FMOje6VZNnag0b44g%3D%3D')=='92ui3FMOje6VZNnag0b44g=='
    assert job_id('https://www.offertoday.com/en/job/bad%2Fid') is None

def test_authoritative_id_deduplicates_different_detail_paths():
    d=day([sample(sourceJobId='official-123',jobUrl=f'https://www.offertoday.com/en/job/{i}') for i in range(2)])
    assert len(d['posts'])==1 and d['posts'][0]['jobId']=='official-123'
