import fs from 'node:fs';
import path from 'node:path';

/** Cleanup only rooms created by this test page. Never alter license or API data rules. */
export function ownedRoomCleanup(baseURL, artifactFolder) {
  const rooms = new Map();
  const pending = new Set();
  fs.mkdirSync(artifactFolder, { recursive: true });
  const track = page => page.on('response', response => {
    if (response.request().method() !== 'POST' || response.status() !== 201 || new URL(response.url()).pathname !== '/api/meetings') return;
    const task = response.json().then(data => {
      if (!data.meetingCode || !data.hostToken) return;
      rooms.set(data.meetingCode, data.hostToken);
      // Ignored local artifacts only; do not print or publish credentials.
      fs.appendFileSync(path.join(artifactFolder, 'qa-owned-rooms.private.jsonl'), JSON.stringify({ code: data.meetingCode, token: data.hostToken }) + '\n');
    }).catch(() => {});
    pending.add(task);
    task.finally(() => pending.delete(task));
  });
  const cleanup = async () => {
    await Promise.allSettled([...pending]);
    const results = [];
    for (const [code, token] of rooms) {
      try {
        const response = await fetch(`${baseURL}/api/meetings/${code}/end`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
        results.push({ code, status: response.status });
        if (response.ok || response.status === 409 || response.status === 404) rooms.delete(code);
      } catch (error) { results.push({ code, error: error.name }); }
    }
    if (results.length) fs.appendFileSync(path.join(artifactFolder, 'qa-cleanup.jsonl'), JSON.stringify(results) + '\n');
  };
  return { track, cleanup };
}
