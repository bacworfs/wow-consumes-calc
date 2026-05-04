# Tasks: Classic WoW Crafting Calculator

**Branch**: `001-classic-wow-vanilla`
**Generated**: 2026-05-01
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Legend: `[P]` = parallelizable with siblings | `[ ]` = todo | `[x]` = done

---

## Phase 0 — Project Scaffold

- [x] **T-001** Create `index.html` app shell (viewport, linked CSS/JS, search input, results area, material list area)
- [x] **T-002** Create `style.css` with base layout, color palette (dark WoW-ish theme), responsive containers
- [x] **T-003** Create empty JS module stubs: `app.js`, `wowhead.js`, `resolver.js`, `inventory.js`
- [x] **T-004** Create `data/` directory and placeholder `data/fallback.json` (empty object for now)
- [x] **T-005** Create `.github/workflows/deploy.yml` for GitHub Pages deploy on push to `main`

---

## Phase 1 — WoWHead Data Layer (FR-005)

Depends on: T-003

- [x] **T-010** `wowhead.js`: implement `searchItems(query)` — fetches WoWHead Classic opensearch endpoint via allorigins proxy, returns `[{id, name}]`, caches in localStorage with 24h TTL
- [x] **T-011** `wowhead.js`: implement `getItemData(itemId)` — fetches item XML via allorigins proxy, parses CDATA JSON block, extracts `createdBy` spell IDs, caches with 7d TTL
- [x] **T-012** `wowhead.js`: implement `getRecipe(spellId)` — fetches spell XML via allorigins proxy, parses reagents array into `Recipe` shape, caches with 7d TTL
- [x] **T-013** `wowhead.js`: implement `clearCache()` and `getCacheStats()` utility functions
- [x] **T-014** Build `data/fallback.json` — curated static recipes for top ~100 vanilla consumables (potions, flasks, food, bandages, engineering tinkers) sourced from community dataset
- [x] **T-015** `wowhead.js`: implement fallback logic — on any fetch failure, check `fallback.json` before throwing

---

## Phase 2 — Recursive Resolver (FR-002, FR-008)

Depends on: T-010, T-011, T-012

- [x] **T-020** `resolver.js`: implement `resolveItem(itemId, quantity, options)` — recursively resolves all sub-components down to raw materials. Returns flat `[MaterialLine]` array with totals summed.
- [x] **T-021** `resolver.js`: add circular reference guard using a `visited` Set
- [x] **T-022** `resolver.js`: add `craftToggle` support — per-item flag (stored in localStorage) for whether to resolve sub-components or treat as raw. Default: resolve if craftable.
- [x] **T-023** `resolver.js`: handle multi-produces recipes (e.g. recipe yields 3 items — adjust quantity math accordingly)

---

## Phase 3 — Inventory Tracker (FR-004, User Story 2)

Depends on: T-003

- [x] **T-030** `inventory.js`: implement `setInventory(itemId, qty)`, `getInventory(itemId)`, `getAll()` — persists to localStorage key `wow-calc-inventory`
- [x] **T-031** `inventory.js`: implement `applyToMaterials(materialLines)` — subtracts inventory from each MaterialLine, sets `needed` and `isSatisfied` fields
- [x] **T-032** `inventory.js`: implement `clearInventory()` and `importInventory(csvText)` for bulk entry

---

## Phase 4 — UI: Search + Material Breakdown (User Story 1)

Depends on: T-001, T-002, T-010, T-020

- [x] **T-040** `app.js`: wire up search input with debounce (300ms) — calls `searchItems()`, renders autocomplete dropdown
- [x] **T-041** `app.js`: on item select — fetch recipe, call `resolveItem()`, render material list
- [x] **T-042** `app.js`: quantity input — number field beside item name, re-resolves on change
- [x] **T-043** `app.js`: render material list — each row shows item icon (WoWHead icon URL), name, quantity needed, satisfied indicator (green checkmark if on hand)
- [x] **T-044** `app.js`: render profession badge on each material line (which profession produces it, if craftable)
- [x] **T-045** `app.js`: add craft toggle button per craftable sub-component (calls `resolver.js` craftToggle, re-renders)
- [x] **T-046** `app.js`: add WoWHead link on each item name (opens `https://www.wowhead.com/classic/item={id}` in new tab)

---

## Phase 5 — UI: Inventory Panel (User Story 2)

Depends on: T-030, T-031, T-043

- [x] **T-050** `app.js`: inventory input panel — inline quantity field per material in the list; typing updates inventory in real time and re-renders needed counts
- [x] **T-051** `app.js`: "I have" vs "I need" visual split in material list (satisfied items styled differently — muted/crossed out)
- [x] **T-052** `app.js`: "Clear inventory" button
- [x] **T-053** `app.js`: shopping list summary section — shows only unsatisfied materials, collapsed view for quick copy-paste to chat/Discord

---

## Phase 6 — Multi-Item Queue (User Story 3 — P3)

Depends on: T-040, T-041, T-031

- [x] **T-060** `app.js`: "Add to queue" button on each searched item
- [x] **T-061** `app.js`: queue panel — list of queued items with quantity controls and remove buttons
- [x] **T-062** `app.js`: consolidated resolver — run `resolveItem()` for each queued item, merge and sum shared materials into single shopping list
- [x] **T-063** `app.js`: persist queue to localStorage (`wow-calc-queue`), restore on page load

---

## Phase 7 — GitHub Pages Deploy

Depends on: T-005, all Phase 0-5 tasks complete

- [ ] **T-070** Create GitHub repo `wow-consumes-calc` under `bacworfs` account
- [ ] **T-071** Push `main` branch, verify GitHub Actions deploy workflow fires
- [ ] **T-072** Confirm live at `https://bacworfs.github.io/wow-consumes-calc/`
- [ ] **T-073** Add `README.md` with usage instructions and WoWHead data credit

---

## Parallelizable Groups

| Group | Tasks | Notes |
|-------|-------|-------|
| Phase 0 scaffold | T-001 [P], T-002 [P], T-003 [P], T-004 [P], T-005 [P] | All independent |
| WoWHead fetchers | T-010 [P], T-011 [P], T-012 [P] | All independent modules |
| Resolver + Inventory | T-020–T-023 [P], T-030–T-032 [P] | Independent modules, both depend on Phase 1 |
| UI panels | T-050–T-053 [P] | Can build inventory panel while core list is being tested |

---

## Dependency Order (critical path)

```
T-001/002/003/004/005 (scaffold)
    ↓
T-010/011/012 (WoWHead fetchers)
    ↓
T-020/021/022/023 (resolver)   +   T-030/031/032 (inventory)
    ↓
T-040/041/042/043/044/045/046 (core UI)
    ↓
T-050/051/052/053 (inventory UI)
    ↓
T-060/061/062/063 (queue — P3, can defer)
    ↓
T-070/071/072/073 (deploy)
```
