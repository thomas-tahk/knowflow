// Vercel serverless function: relays in-app feedback to the team's Google Chat space.
// The webhook URL stays server-side (never in the client bundle).
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
  if (process.env.APP_PASSWORD && req.headers['x-app-password'] !== process.env.APP_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' }); return;
  }
  const webhook = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhook) { res.status(500).json({ error: 'Feedback is not configured.' }); return; }

  const { message, context } = req.body ?? {};
  if (!message || !String(message).trim()) { res.status(400).json({ error: 'Empty feedback.' }); return; }

  const text = `*knowflow feedback*\n${String(message).trim()}${context ? `\n_${context}_` : ''}`;
  const r = await fetch(webhook, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }),
  });
  if (!r.ok) { res.status(502).json({ error: 'Could not post to Google Chat.' }); return; }
  res.status(200).json({ ok: true });
}
