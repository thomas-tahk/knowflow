# knowflow — Deploy & Setup Guide

Do these in order. Supabase and Google Chat give you values you'll paste into Vercel, so set them up first.

You'll end up with **5 environment variables**:

| Variable | What it is | Where it comes from |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI diagram generation | console.anthropic.com |
| `APP_PASSWORD` | the shared team password | you choose it |
| `SUPABASE_URL` | cloud storage project URL | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | cloud storage secret key | Supabase → Settings → API (service_role) |
| `GOOGLE_CHAT_WEBHOOK_URL` | where feedback posts | Google Chat space → Webhooks |

> Tip: to test everything locally first, put these same five in a `.env.local` file in the project root, then `npm run dev`. (`.env.local` is gitignored.)

---

## A. Supabase (shared diagram storage)

1. Go to **https://supabase.com** → **Sign in** (you can use your GitHub account).
2. Click **New project**.
   - **Name:** `knowflow`
   - **Database password:** generate one and save it somewhere (you won't need it for the app, but Supabase requires it).
   - **Region:** pick a **US** region (e.g. *East US* or *West US*).
   - Click **Create new project** and wait ~2 minutes while it provisions.
3. In the left sidebar, open **SQL Editor** → **New query**, paste this, and click **Run**:
   ```sql
   create table documents (
     id text primary key,
     title text,
     preset text,
     status text,
     description text,
     data jsonb not null,
     updated_at text
   );
   ```
   You should see "Success. No rows returned." (No row-level-security setup needed — only our server touches this table, using the secret key. `updated_at` is `text` on purpose — it's the exact token the concurrent-edit conflict check compares.)
4. Open **Settings** (gear icon, bottom-left) → **API**. Copy two things:
   - **Project URL** → this is your `SUPABASE_URL`
   - Under **Project API keys**, the **`service_role`** key (click to reveal — it's the *secret* one, **not** `anon`) → this is your `SUPABASE_SERVICE_KEY`
   - ⚠️ The `service_role` key is powerful — only ever paste it into a server env var, never share it or put it in client code. (Our app keeps it server-side.)

---

## B. Google Chat (feedback destination)

> Note: incoming webhooks require a **Google Workspace** account (your district one), and your Workspace admin must allow webhooks. If you don't see the option, that's the likely reason — ask your admin or use a space you own.

1. Open **https://chat.google.com** in a browser.
2. Create a space for feedback (or pick an existing one): **+ → Create a space**, name it e.g. `knowflow feedback`, Create.
3. Click the **space name** at the top → **Apps & integrations** (or **Manage webhooks**).
4. Click **Add webhooks** (or **Webhooks → Add**).
   - **Name:** `knowflow`
   - (Avatar URL optional)
   - Click **Save**.
5. **Copy** the webhook URL it shows (starts with `https://chat.googleapis.com/v1/spaces/...`) → this is your `GOOGLE_CHAT_WEBHOOK_URL`.

---

## C. Vercel (hosting)

1. Go to **https://vercel.com** → **Sign in with GitHub**.
2. **Add New… → Project**.
3. Find **`knowflow`** in the repo list → **Import**. (If it's not listed, click **Adjust GitHub App Permissions** and grant Vercel access to the private repo.)
4. On the configure screen:
   - **Framework Preset:** should auto-detect **Vite**. Leave Build Command (`npm run build`) and Output Directory (`dist`) as detected.
   - Expand **Environment Variables** and add all **five** from the table above (Name + Value, one per row).
5. Click **Deploy** and wait for it to finish. You'll get a URL like `https://knowflow-xxxx.vercel.app`.
6. **Point Vercel at the right branch.** By default Vercel deploys the `main` branch, but our work is on `slice1-plan2-canvas`. Either:
   - **(Recommended)** have me **merge the branch into `main`** and push — then Vercel deploys it automatically; or
   - In Vercel: **Project → Settings → Git → Production Branch**, set it to `slice1-plan2-canvas`, then redeploy.

### Verify the deployment
- Open the URL → you should see the **password screen**. Enter your `APP_PASSWORD`.
- Click **✨ Generate**, paste a few notes, Generate → a diagram should appear (confirms `ANTHROPIC_API_KEY`).
- Make any edit, then **reload** → it should still be there (confirms Supabase storage).
- Open the app in a **second browser/incognito**, log in → you should see the **same** diagrams (confirms it's a shared library, not localStorage).
- Click **💬 Feedback**, send a test note → it should appear in your Google Chat space.

---

## Notes
- **Changing an env var later** requires a redeploy (Vercel → Deployments → ⋯ → Redeploy), or it happens automatically on your next push.
- **Cost:** each AI generation calls Anthropic and costs money. The password gate limits this to your team. Keep an eye on usage in the Anthropic console.
- **Storage fallback:** if `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` are missing, the app silently uses each browser's localStorage instead — so if diagrams aren't shared/persisting, check those two vars are set in Vercel.
