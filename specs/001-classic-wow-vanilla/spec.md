# Feature Specification: Classic WoW Crafting Calculator

**Feature Branch**: `001-classic-wow-vanilla`
**Created**: 2026-05-01
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Search and Calculate Materials (Priority: P1)

A player wants to craft an item (e.g., Major Healing Potion) and needs to know exactly what raw materials to gather. They search for the item, set the desired quantity, and the app shows a flat list of every raw material needed — recursively resolving sub-components (e.g., if a reagent is also craftable, it drills down to the base materials).

**Why this priority**: Core value of the app. Everything else builds on top of this.

**Independent Test**: User can search for "Major Healing Potion", set quantity to 20, and see a complete flat material list with quantities.

**Acceptance Scenarios**:

1. **Given** the app is loaded, **When** the user searches "Major Healing Potion" and sets quantity to 20, **Then** the app shows: Sungrass x20, Blindweed x20, Crystal Vial x20
2. **Given** an item with craftable sub-components, **When** the user requests it, **Then** the app recursively resolves all sub-recipes down to raw/vendor materials
3. **Given** a search query, **When** the user types at least 2 characters, **Then** matching items from all professions appear as suggestions

---

### User Story 2 - Inventory Tracker (Priority: P2)

A player has already gathered some materials and wants to know what they still need. They enter what they have on hand, and the app shows only the remaining materials needed.

**Why this priority**: Without this, users have to mentally subtract — the tracker is the key time-saver.

**Independent Test**: User inputs they have 10 Sungrass, calculates for 20 Major Healing Potions, and sees Sungrass x10 remaining (not x20).

**Acceptance Scenarios**:

1. **Given** a calculated material list, **When** the user enters "I have X of [material]", **Then** the net quantity updates in real time
2. **Given** inventory fully covers a material, **When** viewed, **Then** that material shows as satisfied (green / crossed out)
3. **Given** inventory partially covers a material, **When** viewed, **Then** the remaining quantity is shown

---

### User Story 3 - Multi-Item Queue (Priority: P3)

A player wants to craft multiple different items in one session (e.g., 20 potions + 10 flasks + 5 food buffs). They add multiple items to a queue and get a single consolidated shopping list.

**Why this priority**: Valuable for raid prep but not core to MVP.

**Independent Test**: User adds 3 different items to queue and gets a single deduplicated material list.

**Acceptance Scenarios**:

1. **Given** multiple items in queue, **When** user views the shopping list, **Then** shared materials are consolidated (e.g., if both recipes need Sungrass, totals are summed)
2. **Given** items in queue, **When** a new item is added, **Then** the shopping list updates immediately

---

### Edge Cases

- Item has no recipe (vendor-only or drop): show as a raw material with a WoWHead link
- Item is craftable by multiple professions: show all options, let user pick which recipe to use
- Circular recipe reference (theoretically impossible in vanilla but guard against it): detect and break the cycle
- Quantity set to 0 or left blank: treat as 1
- WoWHead data unavailable / fetch fails: fall back to bundled static JSON for common items

---

## Requirements

### Functional Requirements

- **FR-001**: Users MUST be able to search for any craftable item by name across all Classic vanilla professions
- **FR-002**: The app MUST display a full recursive material breakdown — resolving craftable sub-components down to raw/vendor materials
- **FR-003**: Users MUST be able to set a desired craft quantity and see all material quantities scale accordingly
- **FR-004**: Users MUST be able to input their current inventory and see net remaining materials
- **FR-005**: The app MUST source recipe data from WoWHead Classic (vanilla)
- **FR-006**: The app MUST work as a static site with no server — vanilla JS only, no build step
- **FR-007**: The app MUST be deployable to GitHub Pages under the `bacworfs` account
- **FR-008**: Users MUST be able to toggle whether a sub-component should be crafted or treated as a raw material (e.g., user may prefer to buy Crystal Vials rather than craft them)

### Key Entities

- **Item**: A craftable WoW item. Has an ID, name, and zero or more recipe(s).
- **Recipe**: One way to craft an Item. Has a profession, skill level requirement, and a list of reagents with quantities. An item may have multiple recipes.
- **Reagent**: An item used as a material in a recipe. May itself be craftable (has its own recipe) or be raw/vendor.
- **CraftQueue**: The list of (item, quantity) pairs the user wants to craft.
- **Inventory**: The player's current stock of materials, keyed by item ID with quantity.
- **ShoppingList**: The net materials still needed after subtracting inventory from the full recursive requirement.

## Success Criteria

- **SC-001**: User can find any craftable vanilla WoW item within 3 keystrokes of search
- **SC-002**: Full recursive material breakdown renders in under 500ms for any item
- **SC-003**: Inventory input updates the shopping list in real time (no page reload)
- **SC-004**: App loads and is functional with no internet connection (after first load) via static bundled fallback data
- **SC-005**: App deploys and serves correctly from GitHub Pages

## Assumptions

- Target users are Classic WoW Era (vanilla 1.12) players
- Recipe data will be fetched from WoWHead Classic at runtime and cached locally in localStorage
- A static fallback JSON covering the most common consumables will be bundled for offline use
- No user accounts or server-side persistence — all state is client-side (localStorage)
- Mobile support is out of scope for v1 — desktop browser only
- Enchanting recipes that produce no carriable item (e.g., weapon enchants) are in scope but displayed differently (the "item" is the enchant effect)
- The app does not need to track which character or realm the player is on
