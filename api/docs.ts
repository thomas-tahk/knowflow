// Vercel serverless function: password-gated CRUD for the shared diagram library (Supabase).
import { listDocs, getDoc, saveDoc, deleteDoc, StorageNotConfigured } from '../src/server/docs';

export default async function handler(req: any, res: any) {
  if (process.env.APP_PASSWORD && req.headers['x-app-password'] !== process.env.APP_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' }); return;
  }
  try {
    if (req.method === 'GET') {
      const id = req.query?.id;
      if (id) { res.status(200).json(await getDoc(String(id))); return; }
      res.status(200).json(await listDocs()); return;
    }
    if (req.method === 'PUT' || req.method === 'POST') { await saveDoc(req.body); res.status(200).json({ ok: true }); return; }
    if (req.method === 'DELETE') { await deleteDoc(String(req.query?.id)); res.status(200).json({ ok: true }); return; }
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e) {
    if (e instanceof StorageNotConfigured) { res.status(501).json({ error: 'Storage not configured' }); return; }
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
