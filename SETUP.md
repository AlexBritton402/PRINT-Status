# PRINT Status – Company Stores: Setup (dev store first)

## 1. Import the theme
Online Store → Themes → Import theme → upload `printstatus-revamp-v1.zip`.
It imports as a new, unpublished theme. Your original stays untouched.

New files in this build:

| File | What it does |
|---|---|
| `sections/company-hero.liquid` | Company header: brand color band, logo patch, name, tagline, share link |
| `sections/company-promo.liquid` | Optional promo or announcement. Hidden if empty |
| `sections/organization-directory.liquid` | "Shop by organization" page with search |
| `snippets/organization-tile.liquid` | One tile in the directory |
| `templates/collection.company.json` | Company store layout: header → promo → products |
| `templates/page.organizations.json` | Directory page layout |

## 2. Create collection custom fields (one time)
Settings → Custom data → Collections → Add definition.

| Name | Namespace and key | Type |
|---|---|---|
| Company logo | `custom.company_logo` | File (images only) |
| Brand color | `custom.brand_color` | Color |
| Tagline | `custom.tagline` | Single line text |
| Short link | `custom.short_link` | Single line text |
| Promo image | `custom.promo_image` | File (images only) |
| Promo heading | `custom.promo_heading` | Single line text |
| Promo text | `custom.promo_text` | Multi-line text |
| Promo link | `custom.promo_link` | URL |

The namespace and key must match exactly. The theme reads these names.

## 3. Create the directory page (one time)
1. Online Store → Pages → Add page.
2. Title: `Organizations`. Leave the content blank.
3. Theme template: `organizations`. Save.
4. Online Store → Navigation → Main menu → add the menu item `Shop organizations`, linked to that page.

## 4. Add a company (repeat for each, about 5 minutes)

| Step | Where | Fill |
|---|---|---|
| Collection | Products → Collections → Create | Title: `Acme Corp`, type **Manual** |
| Template | Same page, Theme template | `company` |
| Description | Same page | Order deadlines and pickup info (optional) |
| Custom fields | Bottom of the collection page | Logo, brand color (hex), tagline, short link `acme` |
| Products | Create or duplicate shirts | Add to the collection. Tags: `org-store`, `company-acme` |
| Short link | Online Store → Navigation → URL Redirects → Create | From `/acme` → To `/collections/acme-corp` |

The company now appears in the directory automatically.

## 5. Keep company items out of the general shop (one time)
Use a smart collection for the main catalog:
- Title: `All products`
- Condition: **Product tag** **is not equal to** `org-store`

Link menus to this collection, not `/collections/all`. Shopify's built-in `/collections/all` always lists everything and can't filter. Search will still find company items, which is fine because anyone can buy them.

## 6. Tag orders by company (Shopify Flow, free)
For each company, create a Flow workflow:
- **Trigger:** Order created
- **Condition:** Order → Line items → Product → Tags → *includes* `company-acme`
- **Action:** Add order tags → `acme`

Filter orders by that tag to see each company's sales.

## 7. Test checklist (Bogus Gateway on)
- [ ] `/pages/organizations` lists the company, and search filters it
- [ ] `/acme` redirects to the company store
- [ ] The company store shows the logo, color, tagline and products, and the Copy link button works
- [ ] Company products are NOT in `All products`
- [ ] Place a test order (card `1`) → the order gets tag `acme`
- [ ] Test on a phone
