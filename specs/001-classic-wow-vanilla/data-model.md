# Data Model: Classic WoW Crafting Calculator

## Core Structures (JavaScript objects)

### Item
```js
{
  id: Number,           // WoWHead item ID
  name: String,         // e.g. "Major Healing Potion"
  icon: String,         // WoWHead icon slug e.g. "inv_potion_54"
  recipes: [RecipeRef]  // one item may have multiple recipes (rare in vanilla)
}
```

### RecipeRef
```js
{
  spellId: Number,      // WoWHead spell ID for the recipe
  profession: String,   // "Alchemy" | "Blacksmithing" | "Cooking" | etc.
  skillRequired: Number // minimum skill level to craft
}
```

### Recipe
```js
{
  spellId: Number,
  itemId: Number,       // item produced
  itemName: String,
  produces: Number,     // quantity produced per craft (e.g. 1 flask, or 3 bandages)
  reagents: [Reagent]
}
```

### Reagent
```js
{
  id: Number,           // item ID
  name: String,
  quantity: Number,     // qty needed per single craft
  isCraftable: Boolean  // true if this item has its own recipe in the DB
}
```

### InventoryEntry
```js
{
  itemId: Number,
  name: String,
  quantity: Number
}
```

### QueueEntry
```js
{
  itemId: Number,
  name: String,
  recipeSpellId: Number,  // which recipe to use (if item has multiple)
  quantity: Number
}
```

### MaterialLine (resolved output)
```js
{
  itemId: Number,
  name: String,
  icon: String,
  required: Number,     // total needed
  onHand: Number,       // from inventory
  needed: Number,       // required - onHand (min 0)
  isSatisfied: Boolean  // needed === 0
}
```

## localStorage Schema

```js
// wow-calc-recipes: keyed by itemId
{
  "12345": {
    recipe: Recipe,
    cachedAt: ISO8601String
  }
}

// wow-calc-items: keyed by search query string
{
  "major heal": {
    results: [{ id, name, icon }],
    cachedAt: ISO8601String
  }
}

// wow-calc-inventory: keyed by itemId
{
  "12345": 20,
  "9999": 5
}

// wow-calc-queue: array
[
  { itemId: 12345, name: "Major Healing Potion", recipeSpellId: 11474, quantity: 20 }
]
```

## Cache TTL Rules

| Cache | TTL | Reason |
|-------|-----|--------|
| Recipe data | 7 days | Recipes don't change in vanilla |
| Item search results | 24 hours | Item names don't change |
| Inventory | Permanent | User-managed, no expiry |
| Craft queue | Permanent | User-managed, no expiry |
