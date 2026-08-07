# Storefront

A small, fast e-commerce store you can shape for **any kind of product** — laptops,
clothing, spices — without touching the schema. The difference between niches lives
in admin-editable data, not in code.

Storefront, admin panel and API are one Next.js app, so it deploys as a single
container.

---

## What makes it fit any product type

Three layers, all editable from `/admin`:

**1 — Per-category custom fields.** A category defines the fields its products
need. "Laptops" gets RAM / Processor / Screen size; "Apparel" gets Fabric / Fit /
Care. Those definitions drive the product form, the specification table on the
product page, and — for fields marked filterable — the storefront filters.

**2 — Options and variants.** Add options like Size and Colour, hit *Generate
variants*, and get the full matrix with its own price, SKU and stock per
combination. Products without options get a single implicit variant, so stock and
checkout have exactly one code path.

**3 — Branding and layout.** Store name, logo, colours, font, currency, locale and
tax come from the database and apply instantly — no rebuild. The homepage is an
ordered list of sections (hero, featured, category grid, banner, text) you
rearrange in the admin panel.

> **On the currency selector:** picking a currency in **Admin → Settings**
> changes how prices are *displayed and denominated* — it fills in the symbol
> and number format for you, with a live preview. It does **not** convert your
> existing prices: a product priced at 39 stays 39, shown as `$39.00` or
> `Rs 39.00`. Switching an established store's currency means re-pricing the
> catalogue. Live FX conversion is deliberately out of scope (see the bottom of
> this file).

---

## Quick start

Requirements: **Node 20.9+** and a **PostgreSQL 14+** database.

```bash
git clone <your-repo> && cd ecommerce_app
npm install

cp .env.example .env
# Set DATABASE_URL, then generate a session secret:
#   openssl rand -base64 32
```

Need a database? One container is enough:

```bash
docker run -d --name store-pg -p 5432:5432 \
  -e POSTGRES_USER=store -e POSTGRES_PASSWORD=store -e POSTGRES_DB=store \
  postgres:17-alpine
```

Then:

```bash
npm run db:migrate     # create the schema
npm run db:seed        # demo store: 3 categories, 8 products, coupons, pages
npm run dev
```

- Storefront → http://localhost:3000
- Admin → http://localhost:3000/admin (credentials from `ADMIN_EMAIL` / `ADMIN_PASSWORD`)

**Change the admin password before putting this anywhere public.**

---

## Try the thing it's built for

The claim is that a completely different kind of product fits with no code change.
Test it:

1. **Admin → Categories → New category.** Name it `Spices`.
2. Add custom fields: `Origin` (Text), `Heat` (Dropdown → `Mild, Medium, Hot`,
   tick *Show as a storefront filter*).
3. **Admin → Products → New product.** Pick Spices — the Origin and Heat fields
   appear.
4. Under Options, add `Weight` with values `250g, 500g`, then *Generate variants*
   and set a price and stock for each.
5. Set status **Active**, save, and open `/c/spices`. Heat is a working filter,
   the weights are a variant picker, and the specs render on the product page.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Load demo data (idempotent) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | **Drops all data**, re-migrates, re-seeds |

---

## Deploying

See **[DEPLOY.md](./DEPLOY.md)** for Docker Compose, Cloudflare Tunnel and Railway.

The short version:

```bash
cp .env.example .env      # set AUTH_SECRET
docker compose up --build
```

---

## How it's put together

```
src/
  app/
    (store)/       storefront — Server Components
    admin/
      login/       unguarded
      (panel)/     guarded by requireStaff() in its layout
    actions/       Server Actions (all mutations)
    api/           uploads + health only
  components/
    sections/registry.tsx    homepage section type → component
    store/  admin/  ui.tsx
  lib/
    pricing.ts     single source of truth for order money
    cart.ts        server-side cart, keyed by cookie
    auth.ts        bcrypt + signed JWT cookie
    storage/       local | s3 driver
    catalog.ts     shared storefront queries
    types.ts       attribute schema + section contracts
  proxy.ts         Next 16's middleware (optimistic /admin guard)
prisma/            schema, migrations, seed
```

**Things worth knowing before you change anything:**

- **Money is always integer minor units** (`priceCents`). Only `formatMoney`
  divides by 100. Don't introduce floats.
- **`lib/pricing.ts` is the only place totals are computed.** The cart, the
  checkout summary and order creation all call `computeTotals`, so what the
  customer sees is what gets persisted.
- **Order items are snapshots.** Title, options, image and price are copied onto
  `OrderItem` at purchase, so editing or deleting a product never rewrites order
  history.
- **Stock decrements are guarded.** Order creation runs in a transaction using
  `updateMany({ where: { id, stock: { gte: qty } } })`; if two checkouts race for
  the last unit, exactly one succeeds and the other rolls back entirely.
- **`proxy.ts` is not authorization.** It only checks that a cookie exists, to
  avoid a flash of the admin UI. Real checks are `requireStaff()` in the panel
  layout and in every admin Server Action — Server Actions are POST endpoints
  reachable without the UI.
- **No Next.js data cache.** Pages query Postgres directly and `revalidatePath`
  runs after mutations. On a small store the queries are ~1ms and admin edits are
  visible immediately, which is worth more than the cache.

### Adding a homepage section type

1. Write the component in `src/components/sections/registry.tsx` and add it to
   `renderers`.
2. Add its name to `sectionTypes` and `sectionLabels` in `src/lib/types.ts`.
3. Declare its editable props in `sectionFieldDefs` in
   `src/components/admin/home-sections-editor.tsx`.

### Adding a payment gateway

`src/lib/payments/index.ts` defines a `PaymentProvider` with `begin()`. Cash on
delivery is implemented. Add a driver file, register it in `paymentProviders`,
add it to `enabledPaymentMethods`, and add a webhook route to confirm payment —
checkout itself doesn't change.

---

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | yes | Signs session cookies. `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | recommended | Absolute URLs for metadata and sitemap. Baked in at build time |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed only | The first admin account |
| `STORAGE_DRIVER` | no | `local` (default) or `s3` |
| `S3_*` | if `s3` | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` |
| `SEED_ON_START` | no | `true` seeds demo data on container boot |

---

## Deliberately out of scope

Multi-vendor, multi-currency conversion, translations, subscriptions, digital
downloads, live carrier rates, a plugin system, and a drag-and-drop page builder.
Each was cut to keep this small and fast. All of them fit on top of this schema
later.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Prisma 7 + PostgreSQL · Zod · bcrypt + jose
