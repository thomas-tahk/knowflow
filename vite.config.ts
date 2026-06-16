import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

function readBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (c: any) => { body += c })
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')) } catch { resolve({}) } })
  })
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        // Dev-only API. Mirrors the Vercel functions. No auth gate locally (production enforces it).
        name: 'knowflow-dev-api',
        configureServer(server: ViteDevServer) {
          server.middlewares.use('/api/generate', (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; res.end('Method Not Allowed'); return }
            readBody(req).then(async (payload) => {
              try {
                const mod = await server.ssrLoadModule('/src/server/generate.ts')
                const doc = await mod.generateDiagram({ ...payload, apiKey: env.ANTHROPIC_API_KEY })
                res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(doc))
              } catch (e) {
                res.statusCode = 500; res.setHeader('content-type', 'application/json')
                res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
              }
            })
          })

          server.middlewares.use('/api/docs', (req, res) => {
            const url = new URL(req.url ?? '', 'http://localhost')
            const id = url.searchParams.get('id')
            readBody(req).then(async (payload) => {
              try {
                const mod = await server.ssrLoadModule('/src/server/docs.ts')
                let result: unknown = { ok: true }
                if (req.method === 'GET') result = id ? await mod.getDoc(id) : await mod.listDocs()
                else if (req.method === 'PUT' || req.method === 'POST') await mod.saveDoc(payload)
                else if (req.method === 'DELETE') await mod.deleteDoc(id)
                else { res.statusCode = 405; res.end('Method Not Allowed'); return }
                res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(result))
              } catch (e) {
                // StorageNotConfigured (no Supabase env) -> 501 so the client uses localStorage.
                res.statusCode = (e as Error)?.name === 'StorageNotConfigured' ? 501 : 500
                res.setHeader('content-type', 'application/json')
                res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
              }
            })
          })

          server.middlewares.use('/api/feedback', (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; res.end('Method Not Allowed'); return }
            readBody(req).then(async (payload) => {
              try {
                const webhook = env.GOOGLE_CHAT_WEBHOOK_URL
                if (!webhook) throw new Error('Set GOOGLE_CHAT_WEBHOOK_URL in .env.local to test feedback locally.')
                const text = `*knowflow feedback*\n${String(payload.message ?? '').trim()}${payload.context ? `\n_${payload.context}_` : ''}`
                const r = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) })
                if (!r.ok) throw new Error('Google Chat webhook rejected the message.')
                res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: true }))
              } catch (e) {
                res.statusCode = 500; res.setHeader('content-type', 'application/json')
                res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
              }
            })
          })
        },
      },
    ],
  }
})
