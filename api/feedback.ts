// Vercel serverless function: relays in-app feedback to the team's Discord channel.
// The webhook URL stays server-side (never in the client bundle). Delivery happens from
// Vercel's cloud, so it is unaffected by whatever network the user's browser is on.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
  if (process.env.APP_PASSWORD && req.headers['x-app-password'] !== process.env.APP_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' }); return;
  }
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) { res.status(500).json({ error: 'Feedback is not configured.' }); return; }

  const { message, context } = req.body ?? {};
  if (!message || !String(message).trim()) { res.status(400).json({ error: 'Empty feedback.' }); return; }

  // Discord expects { content }, markdown-formatted, hard-capped at 2000 chars.
  const content = `**knowflow feedback**\n${String(message).trim()}${context ? `\n*${context}*` : ''}`.slice(0, 1900);
  const r = await fetch(webhook, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content }),
  });
  if (!r.ok) { res.status(502).json({ error: 'Could not post feedback.' }); return; }
  res.status(200).json({ ok: true });
}
