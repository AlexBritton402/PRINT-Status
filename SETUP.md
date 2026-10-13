# PRINT Status – Company stores setup

One identifier per company: the **collection handle** (example: `acme`).

- Tag products `company-acme`
- Short link is `/acme`
- Redirect `/acme` → `/collections/acme`

Use this checklist on the dev store first, then again on the live store (section 7).

## 0. Theme files

These files are ours. Original Horizon files stay unchanged so a later Horizon upgrade is a file drop. See [UPGRADING.md](UPGRADING.md).

| File | What it does |
|---|---|
| `sections/company-hero.liquid` | Company header: brand color, logo, name, tagline, share link |
| `sections/company-promo.liquid` | Optional promo. Hidden on the storefront when empty |
| `sections/organization-directory.liquid` | Organizations directory with search |
| `snippets/organization-tile.liquid` | One tile in the directory |
| `templates/collection.company.json` | Company store: header → promo → products |
| `templates/page.organizations.json` | Directory page |
| `templates/product.company.json` | Company product page (no gang-sheet app block) |
| `blocks/company-store-link.liquid` | “Back to [store] store” on the company product page |

On the dev store, upload or connect this theme as an **unpublished** theme. Leave the current live theme published.

## 1. Custom fields (one time)

Settings → Custom data → Collections → Add definition.

The namespace and key must match exactly.

| Name | Namespace and key | Type |
|---|---|---|
| Company logo | `custom.company_logo` | File (images only) |
| Brand color | `custom.brand_color` | Color |
| Tagline | `custom.tagline` | Single line text |
| Short link | `custom.short_link` | Single line text. **Optional.** When blank, the share link uses the collection handle |
| Promo image | `custom.promo_image` | File (images only) |
| Promo heading | `custom.promo_heading` | Single line text |
| Promo text | `custom.promo_text` | Multi-line text |
| Promo link | `custom.promo_link` | URL |

## 2. Organizations page (one time)

1. Online Store → Pages → Add page.
2. Title: `Organizations`. Leave the content blank.
3. Theme template: `organizations`. Save.
4. Online Store → Navigation → Main menu → Add menu item.
5. Name: `Shop Organizations`. Link: the Organizations page. Save the menu.

## 3. Add a company (about 5 minutes)

Example company: handle `acme`, title `Acme Corp`.

1. Products → Collections → Create collection.
2. Title: `Acme Corp`. Type: **Manual**.
3. Search engine listing → edit the URL handle to the short slug: `acme`. Save.
4. Theme template: `company`.
5. Description (optional): order deadlines and pickup info.
6. Custom fields: logo, brand color, tagline. Leave Short link blank unless this store needs a slug other than `acme`.
7. Products: create or duplicate the shirts. On **each** product:
   - Add the product to the `acme` collection.
   - Tags: `org-store` and `company-acme` (the part after `company-` is the collection handle).
   - **Theme template: `company`.** This is required on every company product (otherwise the Kixxl gang-sheet page shows).
8. Online Store → Navigation → URL Redirects → Create redirect.
   - From: `/acme`
   - To: `/collections/acme`

The company shows up in the directory on its own. Repeat this section for the next company, changing only the handle.

## 4. “All products” smart collection (one time)

Shopify’s `/collections/all` lists every product, including company gear. Create a smart collection for the public catalog:

1. Products → Collections → Create collection.
2. Title: `All products`.
3. Condition: Product tag **is not equal to** `org-store`.
4. Point catalog menus at this collection, not `/collections/all`.

Search can still find company items. That is fine; anyone can buy them.

## 5. Tag orders by company (one Flow workflow)

One workflow covers every company. It replaces a separate workflow per company.

1. Apps → Flow → Create workflow.
2. Trigger: **Order created**.
3. Condition: **Order → Line items → Product → Tags — at least one — contains `company-`**. An order with no company product stops here, so the action never runs with an empty tag list.
4. Action: **Add order tags**.
5. In Tags, paste this Liquid. For each line-item product tag that contains `company-`, it emits the rest of the tag (`company-acme` → `acme`). Commas separate tags. Tags must be lowercase.

```liquid
{% for line_item in order.lineItems %}
  {% for tag in line_item.product.tags %}
    {% if tag contains "company-" %}
      {{ tag | remove_first: "company-" }},
    {% endif %}
  {% endfor %}
{% endfor %}
```

6. Turn the workflow on.
7. **Verify on the dev store with a test order** that contains a company product (section 6). The order should get the tag `acme`.

## 5b. Homepage and logo (one time)

The homepage (`templates/index.json`) and its two sections — **DTF hero** and **Service paths** — ship in the theme, using brand images bundled in `assets/` (`ad`, `splash`, `splash2`, `DTFadvert`, `UploadGangsheet`). No Files upload is needed for the homepage.

1. **Header logo** is the one exception. Shopify binds the site-wide logo to a Files image, not a theme asset. Upload `logo.png` (in `assets/`) to **Content → Files**, then **Online Store → Themes → Customize → Theme settings → Logo** and select it. Until then the header shows the shop name as text.
2. In **Customize**, open the **DTF hero** section and set the two buttons' links (default `/collections/all`): e.g. *Upload Your Transfer* → the upload product, *Build a Gang Sheet* → the gang-sheet product.
3. Open **Service paths** and set each card's link to the matching product or page.
4. Set the **main menu** (Navigation → Main menu) to match the live store: **Home · DTF Transfers · Help Center · Contact** (add Shop Organizations / Realtor later).

## 6. Test checklist

Bogus Gateway on. Card number `1`.

- [ ] Homepage: DTF hero banner shows, both buttons work; Service paths cards show and link correctly; featured products load; logo shows in the header
- [ ] `/pages/organizations` lists the company, and search filters it
- [ ] `/acme` redirects to the company store
- [ ] The company store shows the logo, color, tagline, and products, and the Copy link button works
- [ ] Company products are absent from the `All products` collection
- [ ] A test order of a company product gets the order tag `acme`
- [ ] Open a company product: no “Create a Gang Sheet” button; size and color work; Add to cart works; “Back to Acme Corp store” goes to `/collections/acme`
- [ ] A product that is in no company store shows no back link
- [ ] Check the company store and a company product on a phone

## 7. Going live

Repeat sections 1–5 on the live store (custom fields, Organizations page, each company, the All products collection, and the one Flow workflow).

1. Connect this repo as an **unpublished** theme on the live store (or upload a zip of the theme). Do not publish yet.
2. Preview that theme and run the section 6 checklist against the live companies.
3. Publish the theme.
4. Leave the previous theme installed and unpublished so you can roll back by publishing it again.
