// Vercel serverless function: password-gated CRUD for the shared diagram library (Supabase).
// NOTE: explicit .js extension is required — the project is ESM ("type":"module"),
// and Vercel runs this as a native ESM function where extensionless imports throw
// ERR_MODULE_NOT_FOUND (surfaces as FUNCTION_INVOCATION_FAILED). Dev/build don't hit
// this file (dev uses Vite ssrLoadModule on src/server/docs.ts directly).
import { listDocs, getDoc, saveDoc, deleteDoc, StorageNotConfigured, ConflictError, OfficialProtected } from '../src/server/docs.js';

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
    if (req.method === 'PUT' || req.method === 'POST') {
      const { doc, base } = req.body ?? {};
      await saveDoc(doc, base);
      res.status(200).json({ ok: true }); return;
    }
    if (req.method === 'DELETE') { await deleteDoc(String(req.query?.id)); res.status(200).json({ ok: true }); return; }
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e) {
    if (e instanceof StorageNotConfigured) { res.status(501).json({ error: 'Storage not configured' }); return; }
    if (e instanceof ConflictError) { res.status(409).json({ error: 'conflict', currentUpdatedAt: e.currentUpdatedAt }); return; }
    if (e instanceof OfficialProtected) { res.status(403).json({ error: e.message }); return; }
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
