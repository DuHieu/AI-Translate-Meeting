"""Local agent mailbox. Stores data only; never executes message content."""
import argparse
import json
from pathlib import Path
import sqlite3
import sys
from uuid import uuid4

DEFAULT_DB = Path(__file__).resolve().parents[1] / '.agent-bridge' / 'mailbox.sqlite3'
AGENTS = ('codex', 'antigravity')


def connect(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute('''CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, sender TEXT NOT NULL, recipient TEXT NOT NULL,
        body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
        reply_to TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        claimed_at TEXT, completed_at TEXT,
        FOREIGN KEY(reply_to) REFERENCES messages(id))''')
    db.execute('PRAGMA foreign_keys = ON')
    return db


def get_message(db, message_id):
    row = db.execute('SELECT * FROM messages WHERE id = ?', (message_id,)).fetchone()
    if row is None:
        raise ValueError('Message not found')
    return dict(row)


def send(db, sender, recipient, body, reply_to=None):
    if not body.strip():
        raise ValueError('Message must not be empty')
    message_id = uuid4().hex
    with db:
        db.execute('INSERT INTO messages(id,sender,recipient,body,reply_to) VALUES (?,?,?,?,?)',
                   (message_id, sender, recipient, body, reply_to))
    return get_message(db, message_id)


def claim(db, agent, message_id):
    with db:
        changed = db.execute('''UPDATE messages SET status='claimed', claimed_at=CURRENT_TIMESTAMP
            WHERE id=? AND recipient=? AND status='pending' ''', (message_id, agent)).rowcount
        if not changed:
            raise ValueError('Message is not pending for this agent')
    return get_message(db, message_id)


def reply(db, agent, message_id, body):
    if not body.strip():
        raise ValueError('Reply must not be empty')
    reply_id = uuid4().hex
    with db:
        changed = db.execute('''UPDATE messages SET status='done', completed_at=CURRENT_TIMESTAMP
            WHERE id=? AND recipient=? AND status='claimed' ''', (message_id, agent)).rowcount
        if not changed:
            raise ValueError('Claim this message as its recipient before replying')
        original = get_message(db, message_id)
        db.execute('INSERT INTO messages(id,sender,recipient,body,reply_to) VALUES (?,?,?,?,?)',
                   (reply_id, agent, original['sender'], body, message_id))
    return get_message(db, reply_id)


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument('--db', type=Path, default=DEFAULT_DB)
    commands = result.add_subparsers(dest='command', required=True)
    commands.add_parser('doctor')
    for name in ('send', 'reply'):
        cmd = commands.add_parser(name)
        cmd.add_argument('--agent', choices=AGENTS, required=True)
        if name == 'send':
            cmd.add_argument('--to', choices=AGENTS, required=True)
        else:
            cmd.add_argument('id')
        content = cmd.add_mutually_exclusive_group(required=True)
        content.add_argument('--text')
        content.add_argument('--file', type=Path)
    inbox = commands.add_parser('inbox')
    inbox.add_argument('--agent', choices=AGENTS, required=True)
    inbox.add_argument('--status', choices=('pending', 'claimed', 'done', 'all'), default='pending')
    inbox.add_argument('--limit', type=int, choices=range(1, 101), default=20, metavar='1..100')
    commands.add_parser('show').add_argument('id')
    take = commands.add_parser('claim')
    take.add_argument('--agent', choices=AGENTS, required=True)
    take.add_argument('id')
    return result


def main(argv=None):
    args = parser().parse_args(argv)
    db = None
    try:
        if args.command == 'doctor':
            data = {'mode': 'local-mailbox', 'database': str(args.db.resolve()),
                    'exists': args.db.exists(), 'auth': 'local-filesystem',
                    'automatic_delivery': False,
                    'next_step': 'Both agents must run inbox; no Antigravity API connection.'}
        else:
            db = connect(args.db)
            if args.command in ('send', 'reply'):
                body = args.file.read_text(encoding='utf-8-sig') if args.file else args.text
                data = (send(db, args.agent, args.to, body) if args.command == 'send'
                        else reply(db, args.agent, args.id, body))
            elif args.command == 'claim':
                data = claim(db, args.agent, args.id)
            elif args.command == 'show':
                data = get_message(db, args.id)
            else:
                data = [dict(row) for row in db.execute('''SELECT * FROM messages
                    WHERE recipient=? AND (?='all' OR status=?)
                    ORDER BY created_at, rowid LIMIT ?''',
                    (args.agent, args.status, args.status, args.limit))]
        print(json.dumps({'ok': True, 'data': data}, ensure_ascii=False))
        return 0
    except (ValueError, OSError, sqlite3.Error) as error:
        print(json.dumps({'ok': False, 'error': str(error)}, ensure_ascii=False))
        return 1
    finally:
        if db:
            db.close()


if __name__ == '__main__':
    sys.exit(main())
