import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        // Dev-only: serve POST /api/generate by calling the same server handler Vercel uses.
        // The Anthropic key stays on the server (env), never in the client bundle.
        name: 'knowflow-generate-api',
        configureServer(server: ViteDevServer) {
          server.middlewares.use('/api/generate', (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; res.end('Method Not Allowed'); return }
            let body = ''
            req.on('data', (c: any) => { body += c })
            req.on('end', async () => {
              try {
                const payload = JSON.parse(body || '{}')
                const mod = await server.ssrLoadModule('/src/server/generate.ts')
                const doc = await mod.generateDiagram({ ...payload, apiKey: env.ANTHROPIC_API_KEY })
                res.setHeader('content-type', 'application/json')
                res.end(JSON.stringify(doc))
              } catch (e) {
                res.statusCode = 500
                res.setHeader('content-type', 'application/json')
                res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
              }
            })
          })
        },
      },
    ],
  }
})
