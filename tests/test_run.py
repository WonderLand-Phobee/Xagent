import json
from pipeline.run import generate

def test_blocked_run_clears_stale_today_and_writes_health(tmp_path,monkeypatch):
    monkeypatch.delenv('OFFERTODAY_SOURCE_APPROVED',raising=False)
    day=generate(tmp_path)
    assert day['status']=='blocked' and not day['posts'] and day['shortfall']==12
    saved=json.loads((tmp_path/'data/daily'/f"{day['date']}.json").read_text())
    assert saved['lastSuccessfulRunAt'] is None
    assert list((tmp_path/'data/audit'/day['date']).glob('*.json'))
    assert not (tmp_path/'public/demo').exists()

def test_demo_isolated_and_labeled(tmp_path):
    d=generate(tmp_path,demo=True)
    assert d['demo'] and d['status']=='demo' and len(d['posts'])==3
    assert not (tmp_path/'data').exists()


def test_corrupt_history_writes_failure_instead_of_stale_success(tmp_path):
    from pipeline.run import safe_generate
    import datetime
    from pipeline.core import HK
    date=datetime.datetime.now(HK).date().isoformat()
    path=tmp_path/'data/daily'/f'{date}.json'
    path.parent.mkdir(parents=True)
    path.write_text('{broken')
    d=safe_generate(tmp_path)
    assert d['status']=='blocked' and not d['posts']
    assert json.loads(path.read_text())['errors'][0].startswith('Generation failed: JSONDecodeError')
