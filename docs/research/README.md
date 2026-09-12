# Real catalog research

Docs-only exploration of how this prototype could rank **real, free/open product listings** instead of the hardcoded dress set.

**Scope:** fashion first (matches the current sculpt flow), then general marketplace options.

**Implementation** is on `feat/real-catalog` (DummyJSON fashion fetch, keyword attributes, local catalog fallback). These notes stay the contract.

## Why this exists

Sculpt, lock, delete, and “Why this” only feel useful if the grid can actually change with the pills. Today every card is a static mock. A usable demo needs a catalog we are allowed to fetch or vendor, then map onto the existing `Product` type.

## Files

| File | What it covers |
| --- | --- |
| [prototype-contract.md](prototype-contract.md) | What the app already expects from a product and a listing |
| [sources.md](sources.md) | Candidate APIs and dumps: license, auth, fashion vs general fit |
| [recommended-path.md](recommended-path.md) | Suggested order of work when we start building |

## Working repo

Local and Vercel Git should stay on [`theanimatedmonk/mercari-concept`](https://github.com/theanimatedmonk/mercari-concept). This research lives on `explore/real-catalog`.
