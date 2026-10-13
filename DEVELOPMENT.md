# PRINT Status — Development Log & Agent Handoff

Living handoff for the AI agents on this project (Claude + Cursor). Keep it current.
**No secrets in this file — it's a public repo.** Credentials live in
`~/.config/print-status/theme-access.env` (mode 600, outside git).

Last updated: 2026-10-13 — homepage is **live**.

---

## 1. What this is
Shopify **Horizon 3.5.1** theme for PRINT Status (DTF transfers / gang sheets, next-day,
South Bay CA). Store: `print-status-k68snhof.myshopify.com` (dev store, Basic plan,
storefront password-gated). Repo: `AlexBritton402/PRINT-Status` (public), working copy
`~/Projects/PRINT-Status`. Plan lives in §6; setup checklist in `SETUP.md`; upgrade notes in `UPGRADING.md`.

## 2. Current status (done & live)
- **Live theme = `PRINT-Status/main` #189014180131** (published 2026-10-13). Old stock
  **Horizon #189013131555** kept **unpublished** as a one-click rollback.
- **Homepage rebuilt** (`templates/index.json`): `dtf_hero` → `services` → `home_promise` → featured products.
  - `sections/dtf-hero.liquid` — full-bleed brand banner (default `splash2`, South Bay) + 2 CTAs.
  - `sections/service-paths.liquid` — DTFadvert / UploadGangsheet promo cards.
  - `sections/home-promise.liquid` — next-day / pickup / sizes row.
  - Brand images bundled in `assets/` (logo, ad, splash, splash2, DTFadvert, UploadGangsheet).
  - `blocks/_header-logo.liquid` — edited so the logo falls back to `assets/logo.png` (no Files upload needed).
- **Company stores (Phase 1)**: `templates/product.company.json` (clean product page, no Kixxl,
  working Add to cart), `blocks/company-store-link.liquid` ("Back to <store>"),
  `sections/company-hero|company-promo|organization-directory`, `templates/collection.company.json`,
  `templates/page.organizations.json`, `snippets/organization-tile.liquid`.
- `scripts/check_customizations.py` — tripwires; run before every deploy.

## 3. What we CAN and CANNOT do from here
With the **Theme Access token** (scope: `write_themes`) we control **theme files** fully.
Admin **data** needs the admin UI (or a broader Admin API token we don't have).

| Capability | How | Possible now? |
|---|---|---|
| Read the live/preview page | curl w/ storefront password (§4) or `theme pull` | ✅ |
| Write/update theme (sections, templates, liquid, CSS, JS) | `theme push` (§4) | ✅ |
| Bundle & deploy images | put in `assets/`, `theme push` | ✅ |
| Publish / roll back a theme | `theme publish` (§4) | ✅ |
| Verify rendering & function | fetch page, grep, theme-check, Liquid render | ✅ |
| Client-side interactivity (JS in sections, AJAX cart, forms markup) | theme code | ✅ |
| Upload to Shopify **Files** (`shop_images`) | admin UI / Files API | ❌ token lacks scope — bundle in `assets/` instead |
| Main menu / navigation items | admin → Navigation | ❌ admin only |
| Products, prices, collections, metafield **definitions** | admin / Admin API | ❌ admin only |
| Shopify **Flow**, **Forms** app, customer tags | admin | ❌ admin only |

So: the **page itself** (look, layout, sections, interactivity, images in-theme) = fully automatable.
The **store data around it** (menus, products, Files, apps) = still manual admin or needs a wider token.

## 4. Deploy & verify workflow (the reliable path)
Do **not** rely on the GitHub→Shopify sync for templates (it left `index.json` stuck). Push directly:

```bash
. ~/.config/print-status/theme-access.env          # loads token, store, storefront pw

# 1. push ONLY the 8 theme folders (no README/scripts/docs). Make a clean dir:
CLEAN=$(mktemp -d); cp -a assets blocks config layout locales sections snippets templates "$CLEAN"/
npx @shopify/cli theme push --theme 189014180131 --path "$CLEAN" --store "$SHOPIFY_FLAG_STORE"

# 2. publish (already live, but to re-assert / after making a new theme)
npx @shopify/cli theme publish --theme 189014180131 --store "$SHOPIFY_FLAG_STORE" --force

# 3. verify the live/preview render (storefront is password-gated)
J=$(mktemp); B="https://$SHOPIFY_FLAG_STORE"
curl -s -c "$J" "$B/password" -o /dev/null
curl -s -c "$J" -b "$J" -X POST "$B/password" --data-urlencode form_type=storefront_password --data-urlencode "password=$STOREFRONT_PASSWORD" -o /dev/null
curl -s -b "$J" -L "$B/?preview_theme_id=189014180131" -o /tmp/live.html   # grep for your section ids
```
After a push to this (GitHub-connected) theme, Shopify commits the result back to `main`
("Update from Shopify…"), so `git fetch && git rebase origin/main` before pushing local commits.

## 5. Gotchas (learned the hard way — don't repeat)
1. **Which theme is published ≠ what's on GitHub.** GitHub updates a *draft*; publishing is a separate switch. Always confirm with `theme list`.
2. **Empty schema defaults fail on Shopify.** `"default": ""` on a text setting → "default can't be blank" → cascades to "section type X does not refer to an existing section file". Omit the default key. (theme-check & local Liquid render do NOT catch this; `theme push` does.)
3. **Templates carry a `/* auto-generated */` comment** — strip it before `json.load` (see `check_customizations.py`).
4. **GitHub sync is one-directional-flaky for `templates/*.json`** — use `theme push`, not git, to deploy template changes.
5. **Storefront is password-gated** — a plain `GET /` shows the gate; POST the password first. A direct `GET /` right after publishing can trip the host's deploy-safety classifier; use `?preview_theme_id=` instead.
6. **Horizon 4.x** dropped color schemes (→ `color_palette`/`background_color`). Our theme is self-contained 3.5.1; migration notes are in `UPGRADING.md`. Don't strip `color_scheme` on the 3.5.1 base.
7. **Don't edit original Horizon files** except the one documented exception (`_header-logo.liquid`); keep customizations in our own files so upgrades stay a drop-in.
8. **Company products need Theme template = `company` set per product in admin** — tags alone don't switch the template, and the template dropdown only lists templates from the *published* theme.

## 6. The plan (phases & status)
0. Workspace — ✅ (repo, dev store, token-based deploy).
1. **Company stores** — code ✅; needs admin setup per `SETUP.md` (custom fields, Organizations page, pilot company, redirect, Flow tag).
2. **Homepage & nav** — ✅ live. Featured product row is disabled until the store has real products (empty catalog was rendering Horizon “Product title” placeholders). Remaining: set main menu (admin), point hero/service buttons at real products, re-enable the featured row on a real collection.
3. **Realtor program** — not started. Needs boss's realtor product list. Options: tag+Liquid gating (simple, pilot) vs B2B catalog (real gating, now on Basic). Harden either (exclude from search/sitemap/AI channels).
4. **Third-party apps** — pending full app list from boss.
5. **AI & discovery** — identify "their AI system"; clean titles/descriptions/FAQ.
6. **Go live (real store)** — repeat admin setup on live store; publish.
7. **Ongoing** — onboarding SOP; Horizon 4.x decision after pilot.

Basic-plan notes (2026): B2B + Shopify Flow **are** on Basic now; owner-only staff (use a collaborator account for devs); contextual checkout & company-level catalogs still Plus.

## 7. Next actions (prioritized)
1. In admin: set **Main menu** = Home · DTF Transfers · Help Center · Contact.
2. Point **hero + service buttons** at the real gang-sheet / upload products (edit `templates/index.json` settings, push).
3. Add **real featured products** (admin), then re-enable `product_list_fa6P9H` in `templates/index.json` and point it at that collection.
4. Phase 1 admin setup (`SETUP.md`) for a pilot company; verify end-to-end.
5. Get boss inputs: full app list, realtor product list, AI system.

## 8. Working agreement (Claude ⇄ Cursor)
- **Tests & the real rendered page are ground truth.** Always verify on the live/preview after a change (§4).
- **Claude** turns goals into scoped specs, reviews the real diff, runs the fences, deploys & verifies.
  **Cursor** implements on the named edit surface with tests. One writer per file.
- Deploy via `theme push` + verify, then commit to git (rebase on `origin/main` first — Shopify writes back).
- Keep this file, `SETUP.md`, and `UPGRADING.md` current when state changes.

## 9. Key locations
- Repo: `~/Projects/PRINT-Status` · Images source: `~/Downloads/PRINT/store-images/`
- Credentials (gitignored, outside repo): `~/.config/print-status/theme-access.env`
- Local design preview: `~/Downloads/PRINT/print-status-preview.html`
- Live theme id: **189014180131** · Rollback (old Horizon): **189013131555**
