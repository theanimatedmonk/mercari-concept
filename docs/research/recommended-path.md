# Recommended path (later execution)

Do not implement this on `explore/real-catalog`. This is the order to use when we start coding.

## Phase 0 — Keep the mock as fallback

Leave [`src/data/products.ts`](../../src/data/products.ts) in the repo. If the network fails or CORS/CDN breaks, sculpt still runs. A flag or empty-fetch fallback is enough.

## Phase 1 — DummyJSON fashion subset

1. Fetch `womens-dresses` (then add `womens-shoes`, `womens-bags`, `mens-shirts` if the grid is too small).
2. Map `id`, `title` → `name`, `price` → `"$…"`, `thumbnail` → `image`.
3. Stub `condition` / `seller` from `brand` if present.
4. Set `cluster` to `visual-match`.
5. Build `attributes` with a **naive keyword pass** over `title + description + tags` against pill ids/labels in [`attributes.ts`](../../src/data/attributes.ts) (e.g. “red” ≠ plum, but “satin”, “maxi”, “neck” can weakly light `draped` / `interestingNeckline`). Unmatched pills stay `0`.

Expect ranking to be crude. That is still more honest than a frozen grid.

## Phase 2 — Hero listing

Pick one DummyJSON item as the PDP target instead of hard-coded `p37`, **or** keep `p37` as the only full listing and use live data only in the panel. Skip try-on until we have images we control.

## Phase 3 — Stronger tagging (only if Phase 1 feels useless)

- Expand keyword dictionaries (color families → `plum`, silhouette words → `asymmetric`).
- Optional: vendor a **Kaggle fashion CSV** subset (check license) for more titles/colors.
- Optional: on-device or server image labels. Cost and privacy; not required for a first useful demo.

## Phase 4 — General marketplace

Reuse the DummyJSON adapter with a broader category list (or Open Food Facts if the story becomes “any product,” not “dresses”). Canvas pills would need a **category-specific attribute set**; today’s pills are dress-semantic and will not score laptops.

## Risks

| Risk | Mitigation |
| --- | --- |
| Weak semantic match | Honest copy in the panel; iterate dictionaries before ML |
| Image CDN / hotlink failure | Cache thumbnails under `public/` for a pinned subset |
| Rate limits | Fetch once per session; don’t refetch on every pill drag |
| License | Stay on DummyJSON/Fake Store for public deploys until a dump is cleared |
| Vercel | Same GitHub repo `mercari-concept`; this branch does not change production until merged |

## Success for a first useful build

Locking two visual pills (color + silhouette) visibly reorders DummyJSON dresses. Delete a pill and a previously high card drops. Inspiration → sculpt still works offline via the local catalog fallback.
