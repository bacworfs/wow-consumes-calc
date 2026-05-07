import { getItemData, getRecipe } from './wowhead.js';
import { userKey } from './user.js';

function togglesKey() { return userKey('toggles'); }

function loadToggles() {
  try { return JSON.parse(localStorage.getItem(togglesKey()) || '{}'); }
  catch { return {}; }
}

export function setCraftToggle(itemId, shouldCraft) {
  const t = loadToggles();
  t[itemId] = shouldCraft;
  localStorage.setItem(togglesKey(), JSON.stringify(t));
}

export function getCraftToggle(itemId) {
  const t = loadToggles();
  return t[itemId] ?? true;
}

export async function resolveItem(itemId, quantity, visited = new Set()) {
  if (visited.has(itemId)) {
    return [{ id: itemId, name: `Item #${itemId}`, icon: null, quantity, isCraftable: false, profession: null }];
  }

  const itemData = await getItemData(itemId);
  const name = itemData?.name || `Item #${itemId}`;
  const icon = itemData?.icon || null;
  const recipeRefs = itemData?.createdBy || [];

  if (recipeRefs.length === 0) {
    return [{ id: itemId, name, icon, quantity, isCraftable: false, profession: null }];
  }

  if (!getCraftToggle(itemId)) {
    return [{ id: itemId, name, icon, quantity, isCraftable: true, profession: null }];
  }

  visited = new Set(visited);
  visited.add(itemId);

  // Use first available recipe
  const recipeRef = recipeRefs[0];
  let spellId = recipeRef.id;
  let profession = null;
  let produces = 1;
  let reagents = [];

  // WoWHead sometimes embeds reagents directly in the item's createdBy
  if (recipeRef.reagents && recipeRef.reagents.length > 0) {
    reagents = recipeRef.reagents.map(([id, qty]) => ({ id, quantity: qty }));
    const skillId = recipeRef.skill?.[0]?.id;
    profession = skillId ? getProfName(skillId) : null;
    produces = recipeRef.creates?.[0]?.[1] ?? 1;
  } else {
    const recipe = await getRecipe(spellId);
    if (!recipe) {
      return [{ id: itemId, name, icon, quantity, isCraftable: false, profession: null }];
    }
    reagents = recipe.reagents.map(r => ({ id: r.id, quantity: r.quantity }));
    profession = recipe.profession;
    produces = recipe.produces ?? 1;
  }

  const craftsNeeded = Math.ceil(quantity / produces);
  const subResults = [];

  for (const r of reagents) {
    const sub = await resolveItem(r.id, r.quantity * craftsNeeded, visited);
    subResults.push(...sub);
  }

  return mergeMaterials(subResults);
}

function mergeMaterials(materials) {
  const map = new Map();
  for (const m of materials) {
    if (map.has(m.id)) {
      map.get(m.id).quantity += m.quantity;
    } else {
      map.set(m.id, { ...m });
    }
  }
  return Array.from(map.values());
}

const SKILL_MAP = {
  171: 'Alchemy', 164: 'Blacksmithing', 333: 'Enchanting',
  202: 'Engineering', 165: 'Leatherworking', 197: 'Tailoring',
  185: 'Cooking', 129: 'First Aid'
};

function getProfName(skillId) {
  return SKILL_MAP[skillId] || null;
}
