# Prototype contract

What a real catalog must satisfy so sculpt still works. Source of truth: [`src/types.ts`](../../src/types.ts), [`src/lib/scoring.ts`](../../src/lib/scoring.ts), [`src/data/products.ts`](../../src/data/products.ts), [`src/data/listing.ts`](../../src/data/listing.ts).

## Journey

`inspiration` → analysis on the same screen → `sculpt` (canvas + product panel). Listing PDP opens only for product id `p37` today.

A usable catalog demo can keep that journey and treat listing / try-on as optional until we have a stable hero SKU with extra photos.

## `Product` fields

```ts
type Product = {
  id: string;
  name: string;
  price: string;       // display string, e.g. "$108"
  condition: string;
  seller: string;
  image: string;       // URL or public path
  attributes: Record<string, number>;  // 0–1 scores keyed by pill id
  cluster: ProductCluster;
};
```

`cluster` is one of `visual-match` | `style-match` | `contextual-match` | `wrong-direction`. It is a presentation hint, not used in `scoreProduct`. A live adapter can default everything to `visual-match` at first.

`condition` and `seller` are shown on cards. Open APIs often omit C2C condition and seller. Those can be synthesized (`Like new`, a handle derived from brand) without blocking ranking.

## Scoring (this is the hard part)

[`scoreProduct`](../../src/lib/scoring.ts) is **not** keyword search. For each canvas pill:

- missing `product.attributes[id]` counts as `0`
- `deleted` pills **subtract** (`value * 1.4`)
- `locked` pills multiply the contribution by `2.6`
- otherwise `value * weight`

[`whyThis`](../../src/lib/scoring.ts) lists pill labels where the product score is high and the pill is still weighted.

Free listing APIs give title, price, images, category, maybe tags. They do **not** give `plum: 0.97`. Any real catalog needs a later **derive** step: map title / description / tags (and optionally image labels) onto the ids in [`src/data/attributes.ts`](../../src/data/attributes.ts) (`plum`, `asymmetric`, `draped`, `sculptural`, `editorial`, …).

Without that map, locking “Plum” will not reorder the grid.

## Listing PDP

[`listing.ts`](../../src/data/listing.ts) is extra copy and gallery for **one** hero (`p37`): brand, category, description, shipping, seller stats, try-on stills under `public/listing/`.

Must keep for a thin usable demo: card grid + rank.

Can drop or stub: try-on, buyer-protection fee, similar-ids carousel, multi-photo gallery.

## Must keep vs can drop

| Keep | Can drop / stub |
| --- | --- |
| `id`, `name`, `price`, `image` | Realistic C2C seller graph |
| Attribute vectors aligned to pill ids | Cluster labels |
| Enough SKUs that lock/delete visibly re-ranks (dozens, not four) | Full Mercari-like PDP |
| HTTPS images that load in the browser | Try-on, local dress PNGs |

## Mapping sketch (later)

```
open listing  →  { id, name, price, image, rawText }
rawText       →  attribute scores (keyword / tagger / model)
              →  Product
              →  rankProducts(products, canvasPills)
```
