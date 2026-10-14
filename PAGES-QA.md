# PRINT Status — Pages QA / Ironing-Out Tracker

Every page in the system, its state on the staging theme (#189047013667), and what it needs.
Checked 2026-10-13 against the password-gated dev store `print-status-k68snhof`.

**Key insight:** the **theme templates are built**; most gaps are **missing content records**
(pages, products, collections) that live in the **admin**, not the theme. The Theme Access token
can't create those — that needs the boss in admin, or an **Admin API token** so this can be scripted.

Legend: ✅ renders · ⚠️ renders but empty/placeholder · ❌ 404 (no page record) · 🔒 needs a product/collection to test · 🚧 not built yet

## Inventory

| Page | URL | Template (theme) | Staging | Blocker to "iron out" |
|---|---|---|---|---|
| Home | `/` | `index.json` | ✅ | Products grid empty (0 products); otherwise good |
| Design Studio | `/pages/design-studio` | `page.design-studio` ✅ | ❌ 404 | Create the Page record (template `design-studio`); also lives on home ✅ |
| Organizations directory | `/pages/organizations` | `page.organizations` ✅ | ❌ 404 | Create the Page record (template `organizations`) |
| Company store | `/collections/<acme>` | `collection.company` ✅ | ❌ none exist | Create a company Collection (template `company`) + metafields |
| Company product | `/products/<handle>` | `product.company` ✅ | 🔒 | Needs a product set to template `company` |
| FAQ | `/pages/faq` | `page.faq` ✅ | ❌ 404 | Create the FAQ Page (content exists on live store, not dev) |
| Contact | `/pages/contact` | `page.contact` ✅ | ✅ | OK |
| Default product | `/products/<handle>` | `product.json` (Kixxl) | 🔒 | Needs products imported |
| Gang sheet | `/products/<gs>` | `product.gang-sheet` (Kixxl) | 🔒 | Needs the gang-sheet product |
| Upload DTF / image | `/products/<up>` | `product.upload-*` (Kixxl) | 🔒 | Needs the upload products |
| Collection (general) | `/collections/all` | `collection.json` | ⚠️ empty | Products |
| Cart | `/cart` | `cart.json` | ✅ (empty) | OK |
| Search | `/search` | `search.json` | ✅ | OK |
| Blog / Article | `/blogs/news` | `blog`/`article` | ⚠️ empty | Optional content |
| 404 | (any bad URL) | `404.json` | ✅ | OK |
| Realtor collection | `/collections/<r>` | `collection.realtor` | 🚧 | Phase 3 — not built |
| Realtor product | `/products/<r>` | `product.realtor` | 🚧 | Phase 3 — not built |

## Punch list

### A. Content to create (admin — needs boss, or an Admin API token so this can be scripted)
1. **Pages:** create Page records for **Organizations** (template `organizations`), **FAQ** (template `faq`), **Design Studio** (template `design-studio`).
2. **Pilot company:** create a Collection (handle e.g. `acme`, template `company`) + the 3 metafields (logo, brand_color, tagline); a `/acme` redirect.
3. **Products:** import real/test products, including a **"custom transfer"** product to wire into the Design Studio's Add-to-cart, plus the gang-sheet/upload products for the Kixxl templates. Tag company products `org-store` + `company-acme`.
4. **Navigation:** main menu = Home · DTF Transfers · Help Center · Contact · Shop Organizations.
5. **Flow:** the order-tagging workflow (SETUP.md §5).

### B. Theme polish (Theme Access token — this session can do)
1. Assign the **Design Studio product** in the section settings once the product exists.
2. Confirm empty-state copy on collection/search/cart reads on-brand (Horizon defaults are fine; tweak if wanted).
3. Verify the homepage product grid points at the right collection once products exist.

### C. Not built yet (future slices)
1. **Realtor program** (`collection.realtor`, `product.realtor`, gating) — Phase 3; needs boss's realtor product list.
2. **Company Manager dashboard** — Admin API + lab host (see COMPANY-STORES.md).

## Fastest path to iron it all out
Create an **Admin API custom-app token** (admin → Settings → Apps → Develop apps → scopes: `write_content`, `write_products`, `write_collections`, `write_online_store_pages`/`write_themes`). With it, this session can **script** the missing pages, a pilot company + metafields, test products, and the redirect — then every page above renders and we verify end-to-end. Without it, the boss creates them in admin following `SETUP.md`, and we verify each.
