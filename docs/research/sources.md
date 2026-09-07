# Listing sources

Fashion first, then general marketplace. “Open” here means: no paid key for a first demo, a license we can live with for a prototype, and images we can show in a browser.

Recheck each license and image CDN policy before shipping anything public.

## Fashion-first

| Source | Auth | CORS | Size / fashion fit | Notes |
| --- | --- | --- | --- | --- |
| **DummyJSON** `https://dummyjson.com/products/category/womens-dresses` (also `womens-shoes`, `womens-bags`, `mens-shirts`, `mens-shoes`) | None | Yes | Tens of SKUs per category; titles, price, `thumbnail` / `images`, brand, description, tags | **Best first fetch.** Not C2C; condition/seller missing. Images hosted by DummyJSON. |
| [Fake Store API](https://fakestoreapi.com/) `products/category/women's clothing` | None | Yes | ~4 women’s + ~4 men’s clothing | Too small to sculpt against. Fine as a smoke-test adapter. |
| [Platzi Fake Store](https://fakeapi.platzi.com/) | None | Yes | Clothing category exists; still a mock catalog | Similar to Fake Store; check current category ids. |
| Kaggle / research fashion CSVs (e.g. Myntra-style “Fashion Product Images”) | Download, not live | N/A | Thousands of titles, colors, categories, image URLs | **Offline dump.** License varies per dataset. Not a live API. Good if DummyJSON is too thin. |
| DeepFashion / Fashion-MNIST | Research | N/A | Images or landmarks, not shop listings | Wrong shape: no price/title marketplace rows. Skip for this prototype. |

## General marketplace (later)

| Source | Auth | Fit | Notes |
| --- | --- | --- | --- |
| DummyJSON all product categories | None | Electronics, groceries, furniture, beauty, plus fashion | Same adapter as fashion; switch category list. |
| Fake Store API (all) | None | Electronics, jewelry, clothing | Tiny catalog. |
| [Open Food Facts](https://world.openfoodfacts.org/data) | None | Grocery / packaged food | Real products, barcodes, images. Not apparel. Heavy JSON. |
| [Open Beauty Facts](https://world.openbeautyfacts.org/) / Open Products Facts | None | Beauty / misc packaged goods | Same family as Open Food Facts. |
| DummyJSON `products/search?q=` | None | Query-shaped catalogs | Could later map inspiration text → search, still need attribute derive. |

## Not for v1 (not free/open for this demo)

| Source | Why not |
| --- | --- |
| Mercari, OfferUp, Poshmark | ToS, auth, not an open catalog |
| eBay Browse, Etsy Open API, Amazon PA-API | Developer keys, usage rules, not “open listings” |
| Unofficial scrapers | Fragile, against ToS, bad for a public Vercel deploy |
| Shopify Storefront on a random merchant | Needs a store *we* own plus token; not a public open set |

## Image and legal risks

- Hotlinking third-party product photos can break (hotlink protection) or violate the dataset license even if the JSON is free to read.
- DummyJSON and Fake Store are **mock** goods: fine for a prototype, not for implying they are real Mercari inventory.
- Kaggle dumps: read the specific license (often non-commercial or research-only).
- Never ship scraped Mercari HTML as if it were an open API.

## Practical bar for “usable”

Need **enough fashion SKUs** that two locked pills change the top of the grid. DummyJSON dress/shoe/bag categories together are a plausible first bar. Fake Store clothing alone is not.
