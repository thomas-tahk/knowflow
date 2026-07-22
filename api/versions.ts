// Vercel serverless function: read-only version history for the shared diagram library.
// Writes never happen here — restore goes through the normal save path (api/docs.ts),
// which archives the replaced version itself. NOTE: explicit .js extension required (ESM,
// see api/docs.ts).
import { listVersions, getVersion, StorageNotConfigured } from '../src/server/docs.js';

interface VercelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[]>;
}
interface VercelResponse {
  status(code: number): { json(body: unknown): void };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.APP_PASSWORD && req.headers['x-app-password'] !== process.env.APP_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' }); return;
  }
  try {
    if (req.method !== 'GET') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
    const id = req.query?.id;
    if (id) { res.status(200).json(await getVersion(Number(id))); return; }
    const docId = req.query?.docId;
    if (docId) { res.status(200).json(await listVersions(String(docId))); return; }
    res.status(400).json({ error: 'docId or id required' });
  } catch (e) {
    if (e instanceof StorageNotConfigured) { res.status(501).json({ error: 'Storage not configured' }); return; }
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
