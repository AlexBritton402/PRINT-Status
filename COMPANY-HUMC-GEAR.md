# Pilot Company Store — HUMC Gear

The first company store. Branded, hidden, fulfilled by PRINT Status. Ready to execute the
onboarding SOP (SETUP.md) the moment an Admin API token exists (or the boss creates it in admin).

## Brand (have)
| Field | Value |
|---|---|
| Company name | **HUMC Gear** |
| Logo | `assets/humc-gear-logo.png` (800×145, transparent) — also upload to Shopify Files |
| Brand color (hex) | **#0070b0** (sampled from the logo) |
| Tagline | *(placeholder)* "Official HUMC gear — fulfillment by PRINT Status" — confirm with boss |
| Collection handle | `humc-gear` |
| Short link | `/humc` → `/collections/humc-gear` |
| Template | `collection.company` (built) + `product.company` (built) |
| Order tag (Flow) | `humc-gear` |

## Still needed to go live
1. **Admin API token** — to create the `humc-gear` collection, set the 3 metafields
   (company_logo, brand_color, tagline), create the `/humc` redirect, and load products.
   (No theme-only path exists: a new collection/page record can't be created with the theme token.)
2. **HUMC products** — a Products CSV (admin → Products → Export) or a product list.
3. **Confirm tagline** with the boss.

## Execution (once token + products arrive) — all scripted
1. Create Collection `humc-gear`, template `company`, hidden from search, no menu link.
2. Set metafields: company_logo=humc-gear-logo.png, brand_color=#0070b0, tagline.
3. Import products; tag each `org-store`, `company-humc-gear`; template `company`.
4. URL redirect `/humc` → `/collections/humc-gear`.
5. Flow: product tag `company-humc-gear` → order tag `humc-gear`.
6. Verify: open `/humc`, see blue HUMC hero + logo + products; place a tagged test order.
