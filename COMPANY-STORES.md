# PRINT Status — Company Stores & Admin Architecture

How partner-company storefronts work, how customers reach them, how the boss manages
them, and the honest cost/limits on "separate domains." Companion to `SETUP.md` (step-by-step)
and `DEVELOPMENT.md` (deploy/workflow).

---

## The vision (what we're building toward)
Each partner company gets **its own branded store page + shareable link**, products are
**distributed** to the right companies, and the boss has **one admin view** that sees every
company store and **tracks/catalogs the orders** for each.

## 1. The store pages — already built
One company = one **Collection** on the single Shopify store, with a branded alternate template.

| Piece | Built? |
|---|---|
| `company` theme template (branded hero + promo + product grid) | ✅ |
| `product.company` template (clean product page, real Add to cart) | ✅ |
| "Back to [store]" link | ✅ |
| `organization-directory` + `page.organizations` (searchable list of all stores) | ✅ |
| Per-company branding via collection metafields (logo, color, tagline) | ✅ (defs set once in admin) |

## 2. Domains & links — the Shopify reality (read this before promising a company a domain)
Shopify Basic = **one storefront on one primary domain**. That shapes what "separate site per company" can be:

| Approach | What the company gets | Cost | Works on Basic? |
|---|---|---|---|
| **Path on main domain** (BUILT) | `printstatus.com/acme` → their branded page | **Free** | ✅ yes |
| **Vanity domain → redirect** | `acmemerch.com` that redirects to `printstatus.com/acme` | **~$12/yr** per domain (registration only) | ✅ yes (registrar redirect) |
| **Subdomain** `acme.printstatus.com` | redirects to the path (URL changes to `/acme`) | Free–cheap (DNS) | ⚠️ redirect only, not a hosted sub-site |
| **Separate Shopify store per company** | a real independent store/site | **$39/mo each** | ✅ but not cheap |
| **Multi-storefront / Markets** | true per-brand storefronts/domains | **Plus (~$2,300/mo)** | ❌ not on Basic |

**Bottom line:** On Basic you **cannot** cheaply point `acmemerch.com` to a *specific* company page as a hosted separate site — Shopify sends extra domains to the primary homepage. The cheap, real options are: **the free `/acme` path**, optionally fronted by a **~$12/yr vanity domain that redirects** to it. All commerce (cart, checkout, orders) stays in the **one** Shopify store, so there's still just **one subscription**. True independent per-company sites cost either $39/mo each or Plus.

**Recommendation:** path links for everyone (free); offer a vanity-domain redirect to companies that want their own URL ($12/yr, they can even own the domain).

## 3. The central admin — two levels
"One admin that sees all stores and tracks their orders" can be done two ways:

**A. Native Shopify admin (ready now, $0).** It already gives most of this:
- **All stores:** Products → Collections lists every company store.
- **Orders per store:** the **Flow rule tags each order `company-<handle>`** → filter/segment Orders by that tag to see (and export) each company's orders.
- **Revenue per store:** filter Orders by tag, or Analytics by tag.
Good enough to launch and track the pilot.

**B. "Company Manager" dashboard (a build — the real panel).** One screen that, via the Shopify **Admin API**:
- lists **every company store** with its logo, link, product count, order count, revenue;
- shows/filters **orders per company** (cataloging, status, export);
- **distributes products** — assign a product to a company (collection + tags) in bulk;
- **creates a company** in one click (collection + template + metafields + `/acme` redirect + Flow tag) instead of the manual SOP.
- **Housed as:** either an **embedded Shopify app** (the boss opens it inside Shopify admin under "Apps" — most natural, he already logs in there) **or** a **standalone dashboard on an Aether lab server**. Both need an **Admin API access token** (broader than the theme token we use for deploys).

## 4. Order tracking & cataloging per company
- Mechanism: the **`company-<handle>` order tag** (added automatically by Flow on each order).
- Native: filter/segment/export Orders by tag.
- Dashboard (B): aggregates per company — counts, revenue, fulfillment status, per-store catalog of orders.

## 5. Product distribution
- A product belongs to a company by being in its **collection** + carrying its **`company-<handle>`** tag.
- Native: add to collection + tag (per product, or **CSV import** for bulk).
- Dashboard (B): a product → companies assignment UI (bulk).

## 6. Phasing (recommended)
- **Pilot:** native Shopify admin (§3A) + free `/acme` path links + `SETUP.md` SOP. Nothing to build.
- **Scale:** add vanity-domain redirects for companies that want them, and build the **Company Manager dashboard** (§3B) once manual onboarding/order-tracking gets tedious.

## 7. What each part needs
- Store **pages**: the theme (done) + the **Theme Access token** (have) to deploy.
- **Dashboard / automation**: a Shopify **Admin API** custom-app token (create in admin → Develop apps) + a host (Aether lab server or an embedded-app host). Not yet set up.

## 8. Open decisions for Alexander / the boss
1. Admin: **pilot on native admin** now, or **build the Company Manager dashboard** (and embedded-app vs lab-hosted)?
2. Domains: offer companies **vanity-domain redirects** (~$12/yr) or keep everyone on free `/acme` paths?
3. Add the **"Shop Organizations" path** to the homepage + main menu now?
