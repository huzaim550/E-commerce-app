# Deploying

The same image serves both paths below. Pick one.

| | Local + Cloudflare Tunnel | Railway |
| --- | --- | --- |
| Database | Postgres container | Railway Postgres |
| Uploads | Docker volume | **Cloudflare R2 / S3** (disk is ephemeral) |
| Cost | Your machine | Usage-based |
| Good for | Self-hosting, full control | No server to babysit |

---

## 1 · Docker Compose (local or your own VPS)

### Setup

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```ini
AUTH_SECRET="<paste: openssl rand -base64 32>"
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="something-long-and-not-this"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
SEED_ON_START=true      # demo data on first boot; set false afterwards
```

`DATABASE_URL` in `.env` is for running Next.js on your host. Compose builds its
own connection string pointing at the `postgres` service, so you don't need to
change it.

### Run

```bash
docker compose up --build -d
docker compose logs -f web
```

The store is on http://localhost:3000, admin at `/admin`.

> **Podman** works too — `podman compose up --build -d`. On Fedora:
> `sudo dnf install podman-compose`.

### Everyday commands

```bash
docker compose ps                              # status
docker compose logs -f web                     # logs
docker compose down                            # stop (data survives)
docker compose down -v                         # stop and DELETE the database
docker compose exec web npx prisma migrate deploy   # apply new migrations
docker compose exec postgres pg_dump -U store store > backup.sql
```

### Uploads

The `uploads` volume is mounted at `/app/data/uploads` and survives rebuilds.
Back it up along with the database:

```bash
docker run --rm -v ecommerce_app_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads.tar.gz -C /data .
```

---

## 2 · Public URL with a Cloudflare Tunnel

No port forwarding, no static IP, free TLS.

### Quick throwaway URL (no account)

```bash
cloudflared tunnel --url http://localhost:3000
```

It prints a random `*.trycloudflare.com` URL. Fine for testing; the URL changes
each run. On Fedora: `sudo dnf install cloudflared`.

### Permanent tunnel with your own domain

1. Cloudflare dashboard → **Zero Trust → Networks → Tunnels → Create a tunnel**.
2. Choose **Cloudflared**, name it, and copy the token.
3. Add a **Public hostname**: your domain → service `http://web:3000`
   (`web` is the compose service name, reachable on the compose network).
4. In `.env`:
   ```ini
   TUNNEL_TOKEN="<the token>"
   NEXT_PUBLIC_SITE_URL="https://store.yourdomain.com"
   ```
5. Start everything:
   ```bash
   docker compose -f compose.yaml -f compose.tunnel.yaml --profile tunnel up -d --build
   ```

`NEXT_PUBLIC_SITE_URL` is compiled into the build, so **rebuild after changing
it** or your sitemap and OpenGraph tags will keep pointing at localhost.

---

## 3 · Railway

### Steps

1. Push this repo to GitHub.
2. Railway → **New Project → Deploy from GitHub repo**. It picks up
   `railway.json` and builds the Dockerfile.
3. In the same project: **New → Database → PostgreSQL**.
4. On the web service, **Variables**:

   ```ini
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   AUTH_SECRET=<openssl rand -base64 32>
   NEXT_PUBLIC_SITE_URL=https://<your-app>.up.railway.app
   ADMIN_EMAIL=you@example.com
   ADMIN_PASSWORD=<a real password>
   SEED_ON_START=true
   STORAGE_DRIVER=s3
   ```

   `${{Postgres.DATABASE_URL}}` is Railway's reference syntax — it wires the
   database in without copying credentials.

5. Add R2 credentials (next section), then **Deploy**.
6. Once it's up, set `SEED_ON_START=false` so redeploys don't re-run the seed.

Migrations apply automatically on boot via `docker-entrypoint.sh`. The healthcheck
at `/api/health` verifies the database connection, not just the process.

### Uploads on Railway — read this

**Railway's container filesystem is wiped on every deploy.** With
`STORAGE_DRIVER=local`, every product image uploaded through the admin panel
disappears the next time you push. Use S3-compatible storage:

**Cloudflare R2** (no egress fees, generous free tier):

1. Cloudflare dashboard → **R2 → Create bucket**.
2. **Settings → Public access** → enable a public r2.dev URL, or connect a custom
   domain.
3. **Manage R2 API Tokens → Create API token** with Object Read & Write.
4. Railway variables:

   ```ini
   STORAGE_DRIVER=s3
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   S3_REGION=auto
   S3_BUCKET=your-bucket
   S3_ACCESS_KEY_ID=<access key id>
   S3_SECRET_ACCESS_KEY=<secret access key>
   S3_PUBLIC_URL=https://pub-xxxx.r2.dev
   ```

`S3_PUBLIC_URL` is the browser-facing base for objects. Any S3-compatible
service works — Backblaze B2, MinIO, AWS S3.

The alternative is a Railway **Volume** mounted at `/app/data`, which keeps
`STORAGE_DRIVER=local` working. R2 is cheaper and faster to serve.

---

## Production checklist

- [ ] `AUTH_SECRET` is a fresh random value, not the example
- [ ] Admin password changed from the seed default
- [ ] `SEED_ON_START=false` after the first successful boot
- [ ] `NEXT_PUBLIC_SITE_URL` matches the real public URL, and you rebuilt after setting it
- [ ] `STORAGE_DRIVER=s3` on Railway (or a volume mounted at `/app/data`)
- [ ] Store name, logo, colours, currency and tax set in **Admin → Settings**
- [ ] `next.config.ts` → `images.remotePatterns` narrowed from `**` to your own
      bucket hostname
- [ ] Database backups scheduled
- [ ] Placed one real test order end to end

---

## Troubleshooting

**`AUTH_SECRET is not set`** — the entrypoint refuses to start without it. Set it
in `.env` (Compose) or the service variables (Railway).

**`Can't reach database server`** — on Compose, `web` waits for the `postgres`
healthcheck; check `docker compose logs postgres`. On Railway, confirm
`DATABASE_URL` uses the `${{Postgres.DATABASE_URL}}` reference.

**Images 404 after a deploy** — `STORAGE_DRIVER=local` on ephemeral disk. Switch
to `s3` and re-upload.

**Sitemap and share previews point at localhost** — `NEXT_PUBLIC_SITE_URL` is
inlined at build time. Set it, then rebuild.

**Admin login loops back to the login page** — the session cookie is `secure` in
production, so it needs HTTPS. Use the tunnel URL, not plain `http://` over a
LAN IP.

**`prisma migrate deploy` fails on boot** — usually a migration already partially
applied. Inspect with `docker compose exec web npx prisma migrate status`.
