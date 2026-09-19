# Production Product Recommendation Layer — Execution Plan

**Branch:** `plan/product-recommendation-layer`  
**Status:** Plan only — implementation starts after merge/review  
**Goal:** Connect the existing AI semantic-intent experience to real ecommerce products.

---

## Current flow (keep intact)

```
User → image + text → LLM (xAI) → semantic tags → user adjusts tags → recommendation panel
```

## Target flow

```
User intent → query builder → product retrieval → normalization → semantic ranking → live product cards → merchant PDP
```

Products should feel like they continuously adapt to what the user means—without a loading spinner on every pill drag.

---

## What already exists in the repo

| Piece | Location | Reuse |
| --- | --- | --- |
| LLM analyze + `catalogQuery` | `src/lib/llm/*` | Keep |
| Canvas pills | `SemanticAttribute` in `src/types.ts` | `state`: `active` \| `less-relevant` \| `deleted` \| `locked` |
| Local ranking | `src/lib/scoring.ts` | v0 of semantic scoring + `whyThis` |
| Feed UI | `SemanticStudio`, `ProductPanel`, `ProductCard` | Re-rank on attribute changes |
| Prototype catalog | `src/lib/catalog/*`, DummyJSON | Replace with `ProductSource` adapters |
| Research notes | `docs/research/*` | DummyJSON path; this doc is the **production merchant** path |

**Gap:** Demo `Product` (`name`, `seller`, `condition`, `cluster`, `attributes: Record<id, number>`) must evolve into a normalized merchant `CatalogProduct` with mappers at the UI boundary during migration.

---

## Architecture

Recommendation layer as a separate module—merchant logic behind adapters.

```
Semantic Intent
    ↓
Query Builder
    ↓
Product Retrieval (ProductSource)
    ↓
Product Normalization
    ↓
Semantic Ranking (mostly local)
    ↓
Product Feed UI
```

```ts
interface ProductSource {
  search(query: string): Promise<CatalogProduct[]>
}
```

Implementations (order):

1. `MockSource` — development / offline
2. `MyntraSource` — MVP real merchant (server-only)
3. `AmazonSource` — later (Creators / Associates API, server-only)

**Do not** couple UI directly to Myntra/Amazon APIs. **Never** expose API keys in the frontend.

---

## Proposed module layout

```
src/lib/recommendation/
  types.ts              // CatalogProduct, MerchantId, RankedProduct, IntentSnapshot
  intent.ts             // snapshot from SemanticAttribute[] + catalogQuery
  queryBuilder.ts       // buildProductQueries(intent): string[]
  ranking.ts            // semanticMatch, queryRelevance, diversity (+ visual later)
  cache.ts              // client session cache; server optional KV
  pipeline.ts           // retrieve → normalize → rank orchestration
  sources/
    ProductSource.ts
    MockSource.ts
    MyntraSource.ts     // used only from API routes
    AmazonSource.ts

api/catalog/search.ts   // POST { queries[] } → CatalogProduct[]
```

UI: `useRecommendationFeed(intent)` — panel sees normalized products + rank explanations only.

---

## Semantic intent (derived, not duplicated in React)

Map canvas state to an internal snapshot for queries and scoring:

```ts
type IntentSnapshot = {
  attributes: Array<{
    id: string
    label: string
    category: 'visual' | 'inferred' | 'user-context'
    weight: number      // use resolvedWeight() from scoring.ts
    locked: boolean     // state === 'locked'
    deleted: boolean    // state === 'deleted'
  }>
  catalogQuery: string  // from AnalyzeResponse, optional seed query
}
```

Example active intent (conceptual):

```json
[
  { "label": "Modern", "weight": 0.9 },
  { "label": "Architectural", "weight": 0.95 },
  { "label": "Wedding-ready", "weight": 1.0, "locked": true },
  { "label": "Editorial", "weight": 0, "deleted": true }
]
```

---

## Query builder

**Function:** `buildProductQueries(intent): string[]` — 2–4 deterministic shopping strings.

**Priority:**

1. Locked attributes  
2. High-weight attributes (threshold e.g. ≥ 0.7)  
3. Context (`user-context`)  
4. Visual / inferred style  
5. Ignore deleted  

**Also:** prepend or merge LLM `catalogQuery` when present.

**Examples:**

- `modern asymmetric wedding guest dress`
- `architectural elegant midi dress interesting neckline`
- `modern one shoulder wedding guest dress`

**v1 policy:** Small weight drags do **not** change queries—only re-rank cached pool. Lock/unlock or crossing weight bands may change queries (debounced retrieve).

---

## Product schema (normalized)

```ts
type CatalogProduct = {
  id: string
  merchant: 'myntra' | 'amazon' | 'mock'
  merchantProductId?: string

  title: string
  brand?: string

  price?: number
  currency?: string

  imageUrl: string
  productUrl: string
  affiliateUrl?: string

  category?: string
  availability?: boolean

  attributes?: string[]           // merchant or derived tags
  attributeScores?: Record<string, number>  // pill id → match strength for ranking

  semanticScore?: number          // filled by ranker
}
```

UI must not care which merchant supplied the row.

---

## Ranking (v1)

Retrieve a **broader** set than top-N from merchant search, then rank locally.

```
productScore =
  semanticMatch * 0.60
  + queryRelevance * 0.20
  + visualSimilarity * 0.15   // omit in v1
  + diversity * 0.05
```

- **semanticMatch:** product title/category/derived attrs vs active pill ids/labels; locked attrs weighted higher; deleted attrs penalize or exclude.  
- **queryRelevance:** which retrieval query surfaced this SKU.  
- **diversity:** reduce near-duplicate titles/brands in top 12.

Refactor/evolve existing `scoreProduct` / `rankProducts` in `src/lib/scoring.ts` into `ranking.ts`; keep behavior compatible during migration.

**Why this?** Generated from rank signals (`matches` / `less`), not hardcoded per product—extend current `whyThis()`.

---

## Interaction rules

When the user changes a semantic bubble:

- Update semantic state immediately  
- Recalculate scores **locally** on cached product pool  
- Reorder with Framer Motion (`layoutId` / position transitions)  
- Keep still-relevant products; smooth add/remove  
- Update “Why this?” from rank explanation  

**Do not:**

- Show loading spinner on every drag  
- Clear the entire product list  
- Call LLM on every interaction  
- Abruptly replace the feed  

**Refetch** only when query set changes (debounced ~300–500ms) or new analyze session—not on every weight tweak.

---

## Product card & merchant navigation

**Card:** image, title, brand, price, merchant, “Why this?” (matches / less of).

**Click:** open merchant PDP via `affiliateUrl ?? productUrl`.

**CTA copy:** `View on Myntra →` / `View on Amazon →`

**Optional:** lightweight in-app modal (image, price, why, CTA)—**no iframe**, checkout stays on merchant.

---

## Data sources & constraints

| Source | Approach |
| --- | --- |
| **MVP** | One real merchant—prefer **Myntra** for fashion demo via affiliate feed/deeplink (e.g. Admitad)—verify account access **before** Phase 5 |
| **Amazon** | Official Creators / Associates API—keyword search + product details—no scraping |
| **Mock** | Realistic fixtures for dev and CI |
| **Fallback** | Keep `src/data/products.ts` hero path if network/API fails |

- No scraping as core data source  
- Product images/content per affiliate program terms  
- Keys only on server (Vercel env)  

---

## Caching

```
semantic state → queries → retrieve (if cache miss) → cache → local rank on pill moves
```

- **Client:** session `Map<normalizedQuery, { products, fetchedAt }>`  
- **Server (optional):** KV/Redis TTL 15–60 min per query  
- Merge multi-query results: dedupe by `(merchant, merchantProductId)`  

---

## Future: visual matching (Phase 8)

After retrieval + semantic ranking work:

```
Inspiration image → embedding → product image embeddings → visualSimilarity term
```

Combine semantic + visual + context. **Not** in MVP.

---

## Build order

| Phase | Deliverable |
| --- | --- |
| **1** | `CatalogProduct` + `ProductSource` interface; API stub |
| **2** | `buildProductQueries(intent)` + unit tests |
| **3** | `MockSource` + fixtures; feature-flag hook in studio |
| **4** | Ranking v1 + live reorder + signal-based “Why this?” |
| **5** | `MyntraSource` + `POST /api/catalog/search` (server-only) |
| **6** | Merchant deeplinks + optional detail modal |
| **7** | Client + server caching |
| **8** | Image embeddings / visual similarity |

---

## Decisions to confirm before implementation

1. **Single vs dual product type** during migration (`CatalogProduct` + mapper recommended).  
2. **Query refresh policy** — conservative v1 (lock-driven query changes only).  
3. **Hero listing** (`LISTING_PRODUCT_ID`) — pinned slot vs purely ranked feed.  
4. **Product↔pill matching** — keep pill `id` keys vs merchant tag strings (hybrid: dictionary + derive from title).  
5. **Myntra feed pre-flight** — API fields, affiliate URLs, image hotlink policy documented in `docs/research/sources.md` update when known.

---

## PR strategy

1. Merge this plan (docs only).  
2. Implement Phases 1–4 on `feat/recommendation-mock` (or stacked PRs).  
3. Phases 5–7 after affiliate/API access confirmed.  

---

## Related docs

- [`docs/research/README.md`](../research/README.md) — earlier DummyJSON exploration  
- [`docs/research/recommended-path.md`](../research/recommended-path.md) — prototype catalog phases  
