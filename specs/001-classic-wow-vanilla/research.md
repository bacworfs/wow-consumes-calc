# Research: Classic WoW Crafting Calculator

## WoWHead Classic API / Data Access

### The CORS Problem

WoWHead does not expose a public REST API with CORS headers. Direct `fetch()` calls from a GitHub Pages domain will be blocked by the browser. Options:

### Option A: WoWHead Tooltip Script (Recommended for item display)
WoWHead provides a JS snippet for tooltips:
```html
<script>const wowhead_tooltips = { "colorlinks": true };</script>
<script src="https://wow.zamimg.com/js/tooltips.js"></script>
```
This is for rendering tooltips, not for programmatic data access.

### Option B: allorigins.win CORS Proxy (Recommended for data fetching)
Free CORS proxy — wraps any URL:
```
https://api.allorigins.win/get?url=https://www.wowhead.com/classic/item=12038&xml
```
Returns `{ contents: "<xml>..." }`. Reliable for low-traffic hobby projects.
**Risk**: Third-party service, could go down. Mitigated by localStorage cache (7-day TTL).

### Option C: WoWHead Luacheck / Community JSON Dataset
Several GitHub repos maintain scraped Classic WoW recipe databases as static JSON:
- `fferflo/wow-classic-items` — comprehensive item/recipe data
- Community datasets on Kaggle

**Trade-off**: Static data (may miss patches), but zero dependency on external services at runtime. Good for the fallback bundle.

### Decision
- **Primary**: allorigins.win proxy to WoWHead XML API for live data
- **Fallback**: Bundled `data/fallback.json` scraped from community dataset covering top ~500 consumable recipes

### WoWHead XML API Endpoints

```
# Item data (includes created-by spell ID)
https://www.wowhead.com/classic/item={itemId}&xml

# Spell data (recipe — includes reagents)
https://www.wowhead.com/classic/spell={spellId}&xml

# Item search by name (returns JSON)
https://www.wowhead.com/classic/search?q={query}&usesearchv2=1&opensearch=1
```

### Parsing Strategy

WoWHead's XML response embeds recipe data in a `<json>` CDATA block inside the XML. Parse flow:
1. Fetch XML via allorigins proxy
2. Parse XML with `DOMParser`
3. Extract the `<json>` CDATA text
4. `JSON.parse()` it to get item/spell data
5. Pull reagents from the `reagents` array

### Item Search

WoWHead's opensearch endpoint returns a simple JSON array:
```json
["query", ["Item Name 1", "Item Name 2"], [], ["url1", "url2"]]
```
Item IDs must be extracted from the URLs.

## GitHub Pages Deploy

Standard static site deploy via GitHub Actions:
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/deploy-pages@v4
        # deploys repo root as static site
```
No build step needed — the entire repo root is the site.

## Profession List (Classic Vanilla)

Crafting professions in scope:
- Alchemy
- Blacksmithing  
- Enchanting
- Engineering
- Leatherworking
- Tailoring
- Cooking
- First Aid

Gathering professions (no recipes, raw materials only):
- Herbalism, Mining, Skinning, Fishing — these produce raw materials shown in shopping list but have no recipe to resolve
