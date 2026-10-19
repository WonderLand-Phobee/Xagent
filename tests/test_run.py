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
