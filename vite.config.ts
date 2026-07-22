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
                else if (req.method === 'PUT' || req.method === 'POST') await mod.saveDoc(payload.doc, payload.base)
                else if (req.method === 'DELETE') await mod.deleteDoc(id)
                else { res.statusCode = 405; res.end('Method Not Allowed'); return }
                res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(result))
              } catch (e) {
                // StorageNotConfigured -> 501 (client uses localStorage); Conflict -> 409;
                // OfficialProtected -> 403 (delete refused). Mirrors api/docs.ts.
                const name = (e as Error)?.name
                res.statusCode = name === 'StorageNotConfigured' ? 501
                  : name === 'Conflict' ? 409
                  : name === 'OfficialProtected' ? 403 : 500
                res.setHeader('content-type', 'application/json')
                res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
              }
            })
          })

          server.middlewares.use('/api/versions', (req, res) => {
            const url = new URL(req.url ?? '', 'http://localhost')
            const id = url.searchParams.get('id')
            const docId = url.searchParams.get('docId')
            ;(async () => {
              try {
                if (req.method !== 'GET') { res.statusCode = 405; res.end('Method Not Allowed'); return }
                const mod = await server.ssrLoadModule('/src/server/docs.ts')
                const result = id ? await mod.getVersion(Number(id))
                  : docId ? await mod.listVersions(docId)
                  : null
                if (result === null && !id) { res.statusCode = 400; res.end('{"error":"docId or id required"}'); return }
                res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(result))
              } catch (e) {
                // StorageNotConfigured -> 501 (client shows "history unavailable"). Mirrors api/versions.ts.
                res.statusCode = (e as Error)?.name === 'StorageNotConfigured' ? 501 : 500
                res.setHeader('content-type', 'application/json')
                res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
              }
            })()
          })

          server.middlewares.use('/api/feedback', (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; res.end('Method Not Allowed'); return }
            readBody(req).then(async (payload) => {
              try {
                const webhook = env.DISCORD_WEBHOOK_URL
                if (!webhook) throw new Error('Set DISCORD_WEBHOOK_URL in .env.local to test feedback locally.')
                const content = `**knowflow feedback**\n${String(payload.message ?? '').trim()}${payload.context ? `\n*${payload.context}*` : ''}`.slice(0, 1900)
                const r = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content }) })
                if (!r.ok) throw new Error('Discord webhook rejected the message.')
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
