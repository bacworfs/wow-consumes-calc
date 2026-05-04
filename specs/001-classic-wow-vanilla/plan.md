# Implementation Plan: Classic WoW Crafting Calculator

**Branch**: `001-classic-wow-vanilla` | **Date**: 2026-05-01 | **Spec**: [spec.md](spec.md)

## Summary

A static vanilla-JS web app that lets Classic WoW (Era/1.12) players look up any craftable item, see the full recursive material breakdown across all professions, track their inventory, and get a net shopping list. Recipe data is fetched from WoWHead Classic at runtime and cached in localStorage. A bundled static JSON covers the most common consumables as a fallback. No build step — deploys directly to GitHub Pages under `bacworfs`.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020), HTML5, CSS3
**Primary Dependencies**: None — zero runtime dependencies. WoWHead tooltip/item API for data.
**Storage**: localStorage (recipe cache + inventory state)
**Testing**: Manual browser testing; no automated test framework for v1
**Target Platform**: Desktop browser (Chrome/Firefox/Edge modern versions)
**Project Type**: Static web app
**Performance Goals**: Search results render in <100ms, material breakdown in <500ms
**Constraints**: No build step, no server, no Node.js required. Must work offline after first load via localStorage cache.
**Scale/Scope**: Single-user, client-side only

## Constitution Check

No violations. Single static project, no backend, no auth, no external accounts required.

## Project Structure

### Documentation (this feature)

```text
specs/001-classic-wow-vanilla/
├── plan.md              # This file
├── research.md          # WoWHead API research
├── data-model.md        # Data structures
├── contracts/           # Module contracts
└── tasks.md             # Task breakdown
```

### Source Code

```text
wow-consumes-calc/
├── index.html           # App shell
├── style.css            # All styles
├── app.js               # Main app — search, UI, state management
├── wowhead.js           # WoWHead data fetching and parsing
├── resolver.js          # Recursive material resolver
├── inventory.js         # Inventory tracker + localStorage persistence
├── data/
│   └── fallback.json    # Bundled static recipes for common consumables
└── .github/
    └── workflows/
        └── deploy.yml   # GitHub Pages deploy action
```

## Architecture

### Data Flow

```
User search
    → wowhead.js: fetch item list from WoWHead (cached in localStorage)
    → app.js: display autocomplete suggestions
    → User selects item + sets quantity
    → wowhead.js: fetch full recipe for item (cached in localStorage)
    → resolver.js: recursively resolve all sub-components
    → inventory.js: subtract what user has
    → app.js: render shopping list
```

### WoWHead Data Strategy

WoWHead Classic exposes item and recipe data via:
- **Item search**: `https://www.wowhead.com/classic/items?filter=cr=86:86;crs=1:4;crv=0:0` (craftable items)
- **Item tooltip/data**: `https://www.wowhead.com/classic/item={id}&xml` — returns XML with recipe reagents
- **Spell (recipe) data**: `https://www.wowhead.com/classic/spell={spellId}&xml`

All fetches go through a localStorage cache keyed by item ID with a 24-hour TTL. On cache miss, fetch live. On network failure, fall back to `data/fallback.json`.

**CORS note**: WoWHead does not support CORS for direct API calls. Will use a JSONP-style approach via WoWHead's `power.js` script loader, OR proxy through a free CORS proxy (cors-anywhere or allorigins.win). Research required — see research.md.

### Recursive Resolver

```
resolve(itemId, quantity):
  recipe = getRecipe(itemId)
  if no recipe → return [{itemId, quantity}]  // raw material
  for each reagent in recipe:
    if reagent.craftable AND user wants to craft it:
      recurse into resolve(reagent.id, reagent.qty * quantity)
    else:
      return [{reagent.id, reagent.qty * quantity}]
  flatten and sum duplicates
```

Guard against circular references with a `visited` Set.

### State Management

All state lives in plain JS objects, persisted to localStorage:

| State | Storage Key | Contents |
|-------|-------------|----------|
| Recipe cache | `wow-calc-recipes` | `{itemId: {recipe, timestamp}}` |
| Item search cache | `wow-calc-items` | `{query: {results, timestamp}}` |
| Inventory | `wow-calc-inventory` | `{itemId: quantity}` |
| Craft queue | `wow-calc-queue` | `[{itemId, quantity}]` |

### GitHub Pages Deploy

`.github/workflows/deploy.yml` — push to `main` triggers deploy of repo root to `https://bacworfs.github.io/wow-consumes-calc/`.
