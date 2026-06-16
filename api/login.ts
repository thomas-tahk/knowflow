// Vercel serverless function: verifies the shared team password (server-side only).
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
  const expected = process.env.APP_PASSWORD;
  if (!expected) { res.status(500).json({ error: 'Server has no APP_PASSWORD configured.' }); return; }
  const password = (req.body ?? {}).password;
  if (password === expected) res.status(200).json({ ok: true });
  else res.status(401).json({ error: 'Incorrect password.' });
}
