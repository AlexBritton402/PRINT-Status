# AGENTS.md — PRINT Status Shopify theme (shared agent context)

Read by Cursor natively and by Claude Code. Keep current. **No secrets in this file.**

## What this repo is
Shopify **Horizon** theme for **PRINT Status** (DTF / gang-sheet print shop).
Two storefronts on **one** Shopify store, one domain, separated by location (path),
**not** cross-linked on the customer side, unified on the **admin** side:
- **PRINT Status** — main store, root `/`.
- **HUMC Gear** — its own location (e.g. `/humc`), same domain. Source brand = the
  `vvpx4r-z1` export; built into this store so it can share the domain.

## Three Shopify shops (verified 2026-10-24)

| Shop | Type | Who | Touch? |
|---|---|---|---|
| `print-status-k68snhof.myshopify.com` | Development / **sandbox** | AlexBritton | **Yes** — this is our store |
| `print-status.myshopify.com` | Collaboration | Print Status org | **Never** (boss’s original shop) |
| `vvpx4r-z1.myshopify.com` | Collaboration | My Store org | **Never** (old HUMC shop) |

## Sandbox store themes (`k68snhof`)
| Thing | Value |
|---|---|
| GitHub | `github.com/AlexBritton402/PRINT-Status.git`, branch `main` |
| Published theme (sandbox default view) | `PRINT-Status/main` **#189014180131** |
| Draft | `PRINT-Status/staging` **#189047013667** |
| Stock (unpublished) | `Horizon` #189013131555 |

## 🚦 What we may update
- **Allowed:** theme files on `print-status-k68snhof.myshopify.com`, including the
  published theme, so Admin → Preview storefront shows current work.
  `theme push --theme 189014180131 --nodelete` (default view) and/or
  `theme push --theme 189047013667 --nodelete` (draft).
- **Never** push, publish, or edit `print-status.myshopify.com` or `vvpx4r-z1.myshopify.com`.
- **Never** `git push` to origin unless the user explicitly asks (GitHub `main` can
  write the sandbox published theme).
- After a sandbox default-view push, `theme list` should still show #189014180131
  as `[live]` **on k68snhof only**. That is the sandbox default, not a collaboration shop.

## Credentials — where they live (NEVER print, commit, or echo the values)
All secrets are in a gitignored file **outside** this repo:
```bash
set -a && . ~/.config/print-status/theme-access.env && set +a
```
This sets: `SHOPIFY_CLI_THEME_TOKEN` (Theme Access, scope write_themes),
`SHOPIFY_FLAG_STORE` (the store domain), `STOREFRONT_PASSWORD` (storefront preview password).

## Pipelines (what the Theme Access token CAN do)
Theme **files only** — sections, templates, snippets, blocks, assets, CSS.
```bash
cd ~/Projects/PRINT-Status && set -a && . ~/.config/print-status/theme-access.env && set +a
npx @shopify/cli theme list                              # read: themes + roles (k68snhof only)
npx @shopify/cli theme push  --theme 189014180131 --nodelete   # write: local -> sandbox default view
npx @shopify/cli theme push  --theme 189047013667 --nodelete   # write: local -> sandbox draft
npx @shopify/cli theme pull  --theme 189014180131 --only <path> --path /tmp/pb
npx @shopify/cli theme check                             # lint
```
Read the sandbox storefront over HTTP (password-gated): GET `/password`, POST
`form_type=storefront_password`+`password=$STOREFRONT_PASSWORD` keeping cookies,
then GET `/` (published sandbox theme) or `/?preview_theme_id=189047013667` (draft).

## What the token CANNOT do (needs the Admin API token — NOT yet provided)
Creating **Page/Collection records** (so a template routes at a URL, e.g. `/pages/humc-gear`),
products, URL redirects, Flow order tags. A template file on staging does nothing until an
admin **record** points at it. Flag these to Alexander; do not fake them.

## Team loop
Alexander → Claude (architect/lead, drives Cursor, reviews the real diff, freezes) ↔
Cursor (implements on the named edit surface, runs checks, reports Changed/files/Tests/
limitations/deviations). Tests and real storefront behavior are ground truth.
