// Vercel serverless function (production). Local dev uses the Vite middleware in vite.config.ts.
// Both call the same generateDiagram handler; the Anthropic key is read from the server env only.
import { generateDiagram } from '../src/server/generate';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  if (process.env.APP_PASSWORD && req.headers['x-app-password'] !== process.env.APP_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const doc = await generateDiagram({ ...(req.body ?? {}), apiKey: process.env.ANTHROPIC_API_KEY });
    res.status(200).json(doc);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
