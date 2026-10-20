# PRINT Status — Governing Project Plan

Single source of truth for the build. The detailed phase plan is the boss/Alex document
**"PRINT Status – Company Stores Implementation Plan" (Oct 20, 2026)** (the version pasted
into the session). This file records the **decisions, amendments, gates, and phase tracker**
on top of it. When this file and memory disagree with that document, this file wins.

Last updated: 2026-10-20.

---

## Model (locked 2026-10-20)
- **One Shopify store, Basic plan.** PRINT Status (DTF / gang sheets) is the **main store at the
  root** `printstatus.com`. Company stores are **hidden branded `/name` paths**, reached by link
  or QR only — never linked from the main site or the directory, hidden from search.
- **Cheapest path:** $0 per added company store; one subscription. Vanity domains optional later
  (redirect-only on Basic).
- **Amendment A — Admin:** on top of the plan's native Shopify-admin + Flow tagging, we are **also
  building a lab-hosted admin layer** that polls the Shopify Admin API, documents each order per
  store, and drives the **email tracking (processing → shipping → delivery) + calendar** that
  already live in the Aether `local-agent` system. Native tagging ships first; the lab layer runs
  in parallel. (User decision 2026-10-20.)
- **Honest Shopify limits:** extra domains/subdomains **redirect** to the primary domain on Basic;
  true separate storefronts need 2 subscriptions or Plus. We are not doing that. Order "separation"
  is by **company tag + collection**, split downstream by the lab admin.

## Where things live (rule: code → GitHub, data → admin)
| Moves automatically (theme code, this repo) | Manual in admin / needs Admin API token |
|---|---|
| templates, sections, blocks, snippets, styles, gating liquid | collections, products, pages, menus, redirects |
| theme JSON (editor also writes these back) | collection + customer custom-field **definitions** |
| the attribution snippet, realtor gating templates | Shopify **Flow** rules, **Forms** app, customer tags |
| the lab-admin integration (lives in `local-agent`, not here) | GA4 / Admin API token creation |

## Gates (what blocks "till completion")
1. **Admin API custom-app token** (scopes: `write_content`, `write_products`, `write_collections`,
   `write_online_store_pages`, `read_orders`/`read_all_orders`). Unblocks: scripting all admin
   content **and** the lab-admin order polling. **Nothing in the admin column or the lab layer
   proceeds without it** (or the boss doing it by hand in admin).
2. **The 2 company stores' identities** — names, logos (transparent PNG), brand color (hex),
   tagline, and product list for each. Plan's Open Decision #1/#2; Phase 1 can't finish without it.
3. **Realtor inputs** — realtor product list + any realtor-only perks (Phase 3).
4. **Boss inputs** — full third-party app list (Phase 4); the shop's "AI system" + who runs it (Phase 5).
5. **GA4 Measurement ID** (optional; visit dashboards. Order attribution works without it).

## Phase tracker (checks = `scripts/check_customizations.py` + staging render verify, DEVELOPMENT.md §4)
- **Phase 0 — Workspace:** ✅ repo, dev store, token deploy, clean baseline (2026-10-20).
- **Phase 1 — Company stores:** code ✅ (product.company, Back-to-store link, company-hero/promo,
  directory built). **Directory to be turned OFF** (homepage card already removed; remove menu link).
  Blocked on: gate 1 (custom fields, collections, Flow) + gate 2 (store identities).
- **Phase 2 — Main site cleanup:** code ✅ (homepage leads with DTF, 2 CTAs, FAQ real). Remaining:
  main menu (admin), point CTAs at real products, re-enable featured row on a real collection (gate 1).
- **Phase 3 — Realtor program:** theme templates ✅ done + endpoint-validated (2026-10-20):
  `sections/realtor-gate.liquid` (tag-gates on `realtor-verified`, apply panel + CSS-hides catalog),
  `templates/collection.realtor.json`, `templates/product.realtor.json`. Pushed to staging #189047013667.
  Caveat: CSS-hide is pilot-grade, not real access control (HTML still in page; search/sitemap/API not
  gated) — harden before realtor go-live. Remaining: customer field, Forms signup, verification tagging,
  Flow, `/pages/realtor` content, a realtor collection to render-verify the gate = gate 1/3.
- **Phase 4 — Third-party apps:** gate 4.
- **Phase 5 — AI & discovery:** gate 4.
- **Phase 6 — Go live:** repeat admin setup on live store, connect repo as unpublished theme,
  boss previews all paths, publish, keep old theme for rollback.
- **Lab admin (Amendment A):** design in `local-agent`; build gated on gate 1. Order poll →
  per-store document → email + calendar.

## Next buildable (ungated) increment
Phase 3 **realtor theme templates** — pure theme code, plan-required, needs no token/content:
`templates/collection.realtor.json` + `templates/product.realtor.json` + gating snippet
(show products to `customer.tags contains 'realtor-verified'`, else an "Apply for realtor access"
message). Build via Cursor → Claude review → tripwires → staging render verify.
