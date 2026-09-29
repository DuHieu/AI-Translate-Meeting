import importlib.util
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import pytest

spec = importlib.util.spec_from_file_location(
    'agent_bridge', Path(__file__).resolve().parents[1] / 'scripts' / 'agent_bridge.py')
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


def test_round_trip_preserves_unicode_and_reply_link(tmp_path):
    db = bridge.connect(tmp_path / 'mail.sqlite3')
    try:
        message = bridge.send(db, 'codex', 'antigravity', 'Kiểm tra mic/camera\nKhông sửa trùng.')
        assert bridge.claim(db, 'antigravity', message['id'])['status'] == 'claimed'
        response = bridge.reply(db, 'antigravity', message['id'], 'Đã kiểm tra.')
        assert response['recipient'] == 'codex'
        assert response['reply_to'] == message['id']
        assert bridge.get_message(db, message['id'])['status'] == 'done'
        assert bridge.get_message(db, message['id'])['body'] == message['body']
    finally:
        db.close()


def test_wrong_recipient_and_duplicate_reply_rejected(tmp_path):
    db = bridge.connect(tmp_path / 'mail.sqlite3')
    try:
        message = bridge.send(db, 'codex', 'antigravity', 'Review')
        with pytest.raises(ValueError):
            bridge.claim(db, 'codex', message['id'])
        with pytest.raises(ValueError):
            bridge.reply(db, 'antigravity', message['id'], 'Premature')
        bridge.claim(db, 'antigravity', message['id'])
        bridge.reply(db, 'antigravity', message['id'], 'Done')
        with pytest.raises(ValueError):
            bridge.reply(db, 'antigravity', message['id'], 'Duplicate')
        assert db.execute('SELECT COUNT(*) FROM messages').fetchone()[0] == 2
    finally:
        db.close()


def test_concurrent_claim_has_single_winner(tmp_path):
    path = tmp_path / 'mail.sqlite3'
    db = bridge.connect(path)
    message = bridge.send(db, 'codex', 'antigravity', 'Review')
    db.close()

    def attempt(_):
        connection = bridge.connect(path)
        try:
            bridge.claim(connection, 'antigravity', message['id'])
            return True
        except ValueError:
            return False
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sum(pool.map(attempt, range(2))) == 1


def test_cli_error_and_empty_input(tmp_path, capsys):
    path = tmp_path / 'mail.sqlite3'
    assert bridge.main(['--db', str(path), 'send', '--agent', 'codex',
                        '--to', 'antigravity', '--text', ' ']) == 1
    assert '"ok": false' in capsys.readouterr().out
    assert bridge.main(['--db', str(path), 'show', 'missing']) == 1


def test_doctor_does_not_claim_live_integration(tmp_path, capsys):
    path = tmp_path / 'mail.sqlite3'
    assert bridge.main(['--db', str(path), 'doctor']) == 0
    assert '"automatic_delivery": false' in capsys.readouterr().out
    assert not path.exists()
