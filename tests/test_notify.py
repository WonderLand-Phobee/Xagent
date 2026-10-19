import io
import json
import pytest
from pipeline.notify import notification, send

def test_no_channel_means_no_send():
    assert not send({'posts':[]}, {'DASHBOARD_URL':'https://example.org'})

def test_blocked_and_deployment_fail_never_claim_ready():
    assert 'blocked' in notification({'status':'blocked','posts':[]},'https://example.org')
    assert 'deployment failed' in notification({'status':'success','posts':[{}]*12},'https://example.org',False)

def test_email_payload_and_acceptance():
    requests=[]
    def open_(req,timeout):
        requests.append(req);return io.BytesIO(b'{"id":"test-message"}')
    assert send({'date':'2026-10-19','status':'partial','posts':[{}]}, {'REMINDER_CHANNEL':'email','DASHBOARD_URL':'https://example.org','RESEND_API_KEY':'fake-test-only','REMINDER_TO':'test@example.org'},open_)
    body=json.loads(requests[0].data)
    assert '1/12' in body['text'] and '11 unfilled' in body['text']

def test_no_credentials_no_request():
    with pytest.raises(ValueError):send({}, {'REMINDER_CHANNEL':'email','DASHBOARD_URL':'https://example.org'})

def test_provider_exception_does_not_leak_token():
    def fail(req,timeout):raise RuntimeError('secret-token-in-url')
    with pytest.raises(RuntimeError) as exc:
        send({}, {'REMINDER_CHANNEL':'telegram','DASHBOARD_URL':'https://example.org','TELEGRAM_BOT_TOKEN':'fake-only','TELEGRAM_CHAT_ID':'1'},fail)
    assert 'secret-token' not in str(exc.value)
