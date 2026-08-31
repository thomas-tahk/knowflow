// Vercel serverless function: where a flow sits in the library — published or draft, under
// which topic, in which position. Content is never touched here; that is api/docs.ts.
//
// Kept separate from api/docs.ts on purpose: editing a flow and publishing one are different
// intents, and a routine autosave must not be able to carry a promotion. NOTE: explicit .js
// extension required (ESM, see api/docs.ts).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setPlacement, reorderTopic, StorageNotConfigured, NotFound, StaleOrder } from '../src/server/docs.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Every route here is a write: the shared team password, always.
  const expected = process.env.APP_PASSWORD;
  if (expected && req.headers['x-app-password'] !== expected) {
    res.status(401).json({ error: 'Unauthorized' }); return;
  }
  if (req.method !== 'PATCH') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const id = req.query?.id ? String(req.query.id) : null;
  const topic = req.query?.topic ? String(req.query.topic) : null;
  try {
    if (id) {
      const { status, topic: newTopic, sortOrder } = req.body ?? {};
      await setPlacement(id, { status, topic: newTopic, sortOrder });
      res.status(200).json({ ok: true }); return;
    }
    if (topic) {
      const ids = (req.body ?? {}).ids;
      if (!Array.isArray(ids)) { res.status(400).json({ error: 'ids array required' }); return; }
      await reorderTopic(topic, ids.map(String));
      res.status(200).json({ ok: true }); return;
    }
    res.status(400).json({ error: 'id or topic required' });
  } catch (e) {
    if (e instanceof StorageNotConfigured) { res.status(501).json({ error: 'Storage not configured' }); return; }
    if (e instanceof NotFound) { res.status(404).json({ error: e.message }); return; }
    if (e instanceof StaleOrder) { res.status(409).json({ error: e.message }); return; }
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
