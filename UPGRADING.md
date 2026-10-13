# Upgrading Horizon

PRINT Status customizations live in our own files. Original Horizon code stays byte-identical **with one exception** (see "Edited Horizon files" below). An upgrade copies the new release's code into this theme and leaves store content in place.

## Edited Horizon files (re-apply on upgrade)

- `blocks/_header-logo.liquid` — one addition: when no Files logo is set (`settings.logo == blank`), render the bundled `assets/logo.png` instead of the shop-name text, so the logo ships through Git with no manual Files upload. Marked in the file with a `PRINT Status:` comment. A fresh Horizon release will overwrite this; re-apply the fallback after upgrading. `scripts/check_customizations.py` fails if the marker is missing, so an accidental overwrite is caught.

This tree is Horizon **3.5.1** (`config/settings_schema.json:5`). Stay on 3.5.1 through the pilot. Move to 4.x only after the pilot, using the procedure below.

## Never overwrite on upgrade

These files are store content. The theme editor writes them. Keep the copies already in this theme:

- `config/settings_data.json`
- `templates/*.json` — index, product, product.gang-sheet, product.upload-*, page.faq, page.contact, and every other JSON template
- `sections/*-group.json` — header and footer (announcements, menu)
- `locales/*.json` — if this store has edited them

## Custom files

Line numbers are Horizon 3.5.1 in this repo.

| File | Horizon internals it relies on |
|---|---|
| `sections/company-hero.liquid` | Page width and margin: `assets/base.css:330` (`--page-margin`), `assets/base.css:345` (`--page-width`), used by the hero inner wrapper. Section chrome: `assets/base.css:413` (`.section-background`), `assets/base.css:426` (`.section--full-width`). Screen-reader hide: `assets/base.css:507` (`.visually-hidden`). Ink color uses the `color_brightness` filter the same way Horizon does in `snippets/color-schemes.liquid:13` and `snippets/variant-main-picker.liquid:14`. |
| `sections/company-promo.liquid` | `assets/base.css:421` (`.section--page-width`). Border color from the active scheme: `snippets/color-schemes.liquid:44` (`--color-border`). Promo button uses Horizon’s `.button` (`assets/base.css:1299`). |
| `sections/organization-directory.liquid` | Same section chrome as the promo (`assets/base.css:413`, `assets/base.css:421`) and scheme classes from `snippets/color-schemes.liquid`. Company collections are those whose `template_suffix` is `company` (the alternate template `templates/collection.company.json`). |
| `snippets/organization-tile.liquid` | No Horizon section or snippet. It renders a collection drop (`url`, `title`, `products_count`, metafield image via `image_url` / `image_tag`). Styles for `.org-tile` live in `sections/organization-directory.liquid`. |
| `sections/dtf-hero.liquid` | Homepage hero. Section chrome `.section--full-width` / `.section-background` (`assets/base.css:413`, `assets/base.css:426`), `--page-margin`, Horizon's `.button` / `.button-secondary`. Banner is a theme asset via `asset_url` (no Files dependency). Selected in `templates/index.json`. |
| `sections/service-paths.liquid` | Homepage service cards. `.section--page-width` (`assets/base.css:421`), scheme var `--color-background`. Declares its own `service` block type inline (no block file needed). Images are theme assets via `asset_url`. |
| `assets/*.png` (logo, ad, splash, splash2, DTFadvert, UploadGangsheet) | Brand/marketing images bundled with the theme so the homepage travels through Git. The site-wide **header logo** is separate: Horizon binds it to a Files image (`logo` setting = `shopify://shop_images/logo.png`), so `logo.png` must also be uploaded to the store's Files once. |
| `templates/collection.company.json` | Horizon section `main-collection`: static `filters` block (`sections/main-collection.liquid:38-43`) and static `_product-card` id `product-card` (`sections/main-collection.liquid:62`). The section is enabled on collection templates (`sections/main-collection.liquid:81-84`). The other two sections in this template are ours (`company-hero`, `company-promo`). |
| `templates/page.organizations.json` | Only our `organization-directory` section. No Horizon section type. |
| `templates/product.company.json` | Horizon section `product-information` renders static `_product-media-gallery` id `media-gallery` and static `_product-details` id `product-details`, both with `closest.product` (`sections/product-information.liquid:4`, `sections/product-information.liquid:7-20`). `_product-details` accepts `@theme` blocks (`blocks/_product-details.liquid:26`, schema `blocks/_product-details.liquid:71-74`), which is how `company-store-link`, `text`, `price`, `variant-picker`, and `buy-buttons` are placed. `buy-buttons` renders static children `quantity` (`blocks/buy-buttons.liquid:109`), `add-to-cart` (`blocks/buy-buttons.liquid:220-225`), and `accelerated-checkout` (`blocks/buy-buttons.liquid:227-232`); the preset lists the same three (`blocks/buy-buttons.liquid:449-464`). This template omits `product-recommendations` because an empty recommendation set falls back to `collections.all` (`sections/product-recommendations.liquid:72-75`). |
| `blocks/company-store-link.liquid` | Runs inside `_product-details`, so it needs `@theme` to stay allowed (`blocks/_product-details.liquid:73`) and `closest.product` from `sections/product-information.liquid:19`. Padding uses `snippets/spacing-style.liquid:11-35` and `.spacing-style` (`assets/base.css:2488-2514`). The company collection is a handle lookup whose `template_suffix` is `company`, the same rule as `sections/organization-directory.liquid`. |

## Upgrade procedure

1. Create a new branch from the current theme.
2. From the new Horizon release, copy code files only: `layout/*.liquid`, `sections/*.liquid`, `blocks/`, `snippets/`, `assets/`, `locales/` (locale files from the release), `config/settings_schema.json`, and `templates/*.liquid`. Do not copy `config/settings_data.json`, any `templates/*.json`, or `sections/*-group.json` from the release. If this store has edited `locales/*.json`, keep those edits.
3. Copy our files back: every row in the table above, plus `SETUP.md`, `UPGRADING.md`, `.gitignore`, and `scripts/check_customizations.py`.
4. Run `python3 scripts/check_customizations.py`. Fix failures before previewing. A tripwire failure means Horizon changed a contract this theme depends on (`@theme` on product details, the `quantity` / `add-to-cart` blocks inside `buy-buttons`, or a section or block type named in a template or section group).
5. Connect the branch as an unpublished theme. Do not publish yet.
6. Open the theme editor on the preview. Fix any section or block the new release renamed or removed. JSON that references a missing type fails to load.
7. Run the [SETUP.md](SETUP.md) section 6 test checklist on that preview.
8. Merge the branch. Publish only after the checklist passes. Keep the previous theme installed for rollback.

## Recommendation

Stay on Horizon 3.5.1 through the pilot. The company product page and the store link were built against the 3.5.1 block contracts above. Revisit 4.x after the pilot, with this procedure, rather than mid-pilot.
