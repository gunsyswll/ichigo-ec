# Photo Manifest — Ichigo EC (review version)

**Purpose:** every image spot on the site, catalogued so the swap to real photos misses nothing.

**🔴 Every photo currently on the site is a TEMPORARY placeholder** — either a styled gradient block or a reused free stock photo (Unsplash) auto-filled by `assets/app.js` from two small pools (`STRAW` = str-bunch/str-farm/str-red/str-one/str-hold, `PEOPLE` = hold-bunch/hold-plant/hold-box/hand-berry). The same stock image is reused in several places, so **do not trust what's currently shown — every spot below must get its own real photo.**

**How to see them on the live site:** add **`?audit=photos`** to any page URL — e.g. `https://gunsyswll.github.io/ichigo-ec/farm.html?audit=photos`. Every photo spot gets a blue **📷 Pnn** badge that matches the IDs below.

**Spec reference (p6 機能②):** farmer photos should cover **人・圃場・収穫・商品** (people / field / harvest / product).

Total: **46 photo spots** across 8 pages.

---

## index.html — 7 spots
| ID | Where | Real photo needed |
|----|-------|-------------------|
| P01 | Hero (top right) | **Hero shot** — the signature ripe-strawberry / "little luxury" lifestyle image |
| P02 | Shop block · Standard Strawberry Box | Product: Standard box |
| P03 | Shop block · Premium Gift Box | Product: Gift box |
| P04 | Shop block · Japanese Strawberry Club | Product: subscription/club box |
| P05 | Farmers · Farm A (Berry Farm) | Farmer A — portrait / in the field (人/圃場) |
| P06 | Farmers · Farm B (Sun Harvest) | Farmer B — portrait / in the field (人/圃場) |
| P07 | FAQ teaser strip | Lifestyle / close-up strawberry detail |

## shop.html — 9 spots (the product grid)
| ID | Product card | Real photo needed |
|----|-------|-------------------|
| P01 | Standard Strawberry Box | Product box |
| P02 | Premium Gift Box | Product box |
| P03 | Japanese Strawberry Club | Subscription box |
| P04 | Amaou Premium Box ⚠️ | Product box *(variety name TBD — Amaou is Fukuoka-only)* |
| P05 | Tochiotome Box ⚠️ | Product box *(variety TBD)* |
| P06 | Luxury Wooden Gift Box | Product box |
| P07 | Sky Berry Limited Box ⚠️ *(gradient only now)* | Product box *(variety TBD)* |
| P08 | Mixed Variety Box | Product box |
| P09 | Premium Hanpukai Plan | Subscription/club |

## farmers.html — 2 spots
| ID | Where | Real photo needed |
|----|-------|-------------------|
| P01 | Farm A — Berry Farm card | Farmer A — people + field (人/圃場) |
| P02 | Farm B — Sun Harvest card | Farmer B — people + field (人/圃場) |

## farm.html — 10 spots (Farm A detail page)
| ID | Where | Real photo needed |
|----|-------|-------------------|
| P01 | Farm hero | Farm A — field / farmer (圃場/人) |
| P02–P06 | "Inside the Farm" gallery (5) | Field, harvest, berries, the farmer at work (圃場/収穫/商品). P05 is gradient-only now |
| P07–P09 | "Boxes from This Farm" products (3) | Product box photos |
| P10 | Farm B cross-link card | Farmer B / Farm B (人/圃場) |

*(Use the on-site `?audit=photos` badges to confirm which is gallery vs product — context here is best-guess.)*

## about.html — 9 spots
| ID | Where | Real photo needed |
|----|-------|-------------------|
| P01 | "Why We Started" story | Brand / origin lifestyle image (人/圃場) |
| P02–P05 | §importer row (4, gradient only) | Import/cold-chain/logistics imagery — **or confirm if these blocks stay** (currently empty placeholders) |
| P06 | "The people behind the brand" | Team / founder lifestyle |
| P07–P08 | Founder / team portraits (2) | People portraits (人) |
| P09 | "Japan Partner" (gradient only) | Partner / company image |

## delivery.html — 2 spots
| ID | Where | Real photo needed |
|----|-------|-------------------|
| P01 | Delivery area (`map-ph`) | **This is a map block, not a photo** — keep as a map/illustration (decide separately) |
| P02 | "Our Promise" freshness | Cold-chain / fresh-arrival product photo |

## product.html — 7 spots (Standard Strawberry Box detail)
| ID | Where | Real photo needed |
|----|-------|-------------------|
| P01 | Main product image | Standard box — hero/main shot |
| P02–P03 | Gallery thumbnails (2) | Standard box — alt angles / detail |
| P04–P07 | "You might also like" (4) | Related product box photos |

---

## Notes for the real swap
- **None of these are final.** Replace each Pnn with its own real photo.
- The reused stock photos hide that some spots currently share one image — every spot needs a distinct real photo.
- Items marked **⚠️ variety TBD** also need the variety/name corrected (placeholder Amaou/Tochiotome/Skyberry contradict the Chiba farms — pending client data).
- `delivery.html P01` is a **map**, not a photo.
- When we convert to the Shopify Liquid theme, each of these becomes an explicit **image_picker** theme/section setting (named slot), so the swap becomes upload-per-named-slot — structurally impossible to miss one. This manifest is the bridge until then.
