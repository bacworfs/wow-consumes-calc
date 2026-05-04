const BASE = 'https://www.wowhead.com/classic';
const TTL_SEARCH = 24 * 60 * 60 * 1000;
const TTL_RECIPE =  7 * 24 * 60 * 60 * 1000;
const PROXY_TIMEOUT = 6000;

const PROXIES = [
  { wrap: url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, extract: r => r.json().then(j => j.contents) },
  { wrap: url => `https://corsproxy.io/?${encodeURIComponent(url)}`,              extract: r => r.text() },
  { wrap: url => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,           extract: r => r.text() },
];

const SKILL_TO_PROFESSION = {
  171: 'Alchemy', 164: 'Blacksmithing', 333: 'Enchanting',
  202: 'Engineering', 165: 'Leatherworking', 197: 'Tailoring',
  185: 'Cooking', 129: 'First Aid'
};

// Static search index — all IDs verified against WoWHead Classic nether API
const VANILLA_ITEMS = [
  // Alchemy — Flasks
  { id: 13510, name: 'Flask of the Titans' },
  { id: 13511, name: 'Flask of Distilled Wisdom' },
  { id: 13512, name: 'Flask of Supreme Power' },
  { id: 13513, name: 'Flask of Chromatic Resistance' },
  { id: 13506, name: 'Flask of Petrification' },
  // Alchemy — Major/rage potions
  { id: 13446, name: 'Major Healing Potion' },
  { id: 13444, name: 'Major Mana Potion' },
  { id: 13442, name: 'Mighty Rage Potion' },
  { id: 13443, name: 'Superior Mana Potion' },
  { id: 1710,  name: 'Greater Healing Potion' },
  { id: 6149,  name: 'Greater Mana Potion' },
  { id: 3827,  name: 'Mana Potion' },
  // Alchemy — Elixirs
  { id: 13452, name: 'Elixir of the Mongoose' },
  { id: 13453, name: 'Elixir of Brute Force' },
  { id: 13454, name: 'Greater Arcane Elixir' },
  { id: 13445, name: 'Elixir of Superior Defense' },
  { id: 13447, name: 'Elixir of the Sages' },
  { id: 3825,  name: 'Elixir of Fortitude' },
  { id: 9187,  name: 'Elixir of Greater Agility' },
  { id: 9264,  name: 'Elixir of Shadow Power' },
  { id: 9232,  name: 'Elixir of Demonslaying' },
  { id: 9155,  name: 'Arcane Elixir' },
  { id: 9030,  name: 'Restorative Potion' },
  { id: 9036,  name: 'Magic Resistance Potion' },
  { id: 9088,  name: 'Gift of Arthas' },
  { id: 9197,  name: 'Elixir of Dream Vision' },
  { id: 6662,  name: 'Elixir of Giant Growth' },
  { id: 3389,  name: 'Elixir of Defense' },
  { id: 3391,  name: 'Elixir of Ogre\'s Strength' },
  { id: 3390,  name: 'Elixir of Lesser Agility' },
  { id: 3383,  name: 'Elixir of Wisdom' },
  // Alchemy — Standard potions
  { id: 5634,  name: 'Free Action Potion' },
  { id: 3387,  name: 'Limited Invulnerability Potion' },
  { id: 5631,  name: 'Rage Potion' },
  { id: 5633,  name: 'Great Rage Potion' },
  { id: 3826,  name: 'Mighty Troll\'s Blood Potion' },
  { id: 3388,  name: 'Strong Troll\'s Blood Potion' },
  { id: 3382,  name: 'Weak Troll\'s Blood Potion' },
  { id: 3823,  name: 'Lesser Invisibility Potion' },
  { id: 3385,  name: 'Lesser Mana Potion' },
  { id: 3384,  name: 'Minor Magic Resistance Potion' },
  { id: 3386,  name: 'Elixir of Poison Resistance' },
  // Alchemy — Protection potions
  { id: 13457, name: 'Greater Fire Protection Potion' },
  { id: 13458, name: 'Greater Nature Protection Potion' },
  { id: 13456, name: 'Greater Frost Protection Potion' },
  { id: 13459, name: 'Greater Shadow Protection Potion' },
  { id: 13460, name: 'Greater Holy Protection Potion' },
  { id: 13461, name: 'Greater Arcane Protection Potion' },
  { id: 13462, name: 'Purification Potion' },
  { id: 13455, name: 'Greater Stoneshield Potion' },
  { id: 6049,  name: 'Fire Protection Potion' },
  { id: 6052,  name: 'Nature Protection Potion' },
  { id: 6050,  name: 'Frost Protection Potion' },
  { id: 6048,  name: 'Shadow Protection Potion' },
  { id: 6051,  name: 'Holy Protection Potion' },
  // Alchemy — Misc
  { id: 13503, name: 'Alchemists\' Stone' },
  { id: 9233,  name: 'Elixir of Detect Demon' },
  { id: 5632,  name: 'Cowardly Flight Potion' },
  // Cooking
  { id: 13928, name: 'Grilled Squid' },
  { id: 13931, name: 'Nightfin Soup' },
  { id: 18254, name: 'Runn Tum Tuber Surprise' },
  { id: 12217, name: 'Dragonbreath Chili' },
  { id: 20452, name: 'Smoked Desert Dumplings' },
  { id: 13927, name: 'Cooked Glossy Mightfish' },
  { id: 13929, name: 'Hot Smoked Bass' },
  { id: 13930, name: 'Filet of Redgill' },
  { id: 13851, name: 'Hot Wolf Ribs' },
  { id: 17222, name: 'Spider Sausage' },
  { id: 13810, name: 'Blessed Sunfruit' },
  { id: 17197, name: 'Gingerbread Cookie' },
  { id: 17198, name: 'Egg Nog' },
  // First Aid
  { id: 14530, name: 'Heavy Runecloth Bandage' },
  { id: 14529, name: 'Runecloth Bandage' },
  { id: 8545,  name: 'Heavy Mageweave Bandage' },
  { id: 8544,  name: 'Mageweave Bandage' },
  // Engineering — Explosives
  { id: 10646, name: 'Goblin Sapper Charge' },
  { id: 16005, name: 'Dark Iron Bomb' },
  { id: 18641, name: 'Dense Dynamite' },
  { id: 15993, name: 'Thorium Grenade' },
  { id: 10562, name: 'Hi-Explosive Bomb' },
  { id: 10507, name: 'Solid Dynamite' },
  { id: 4394,  name: 'Big Iron Bomb' },
  { id: 4390,  name: 'Iron Grenade' },
  { id: 18588, name: 'Ez-Thro Dynamite II' },
  // Engineering — Devices
  { id: 10726, name: 'Gnomish Mind Control Cap' },
  { id: 10645, name: 'Gnomish Death Ray' },
  { id: 18594, name: 'Powerful Seaforium Charge' },
  { id: 18634, name: 'Gyrofreeze Ice Reflector' },
  { id: 18637, name: 'Major Recombobulator' },
  { id: 18638, name: 'Hyper-Radiant Flame Reflector' },
  { id: 18639, name: 'Ultra-Flash Shadow Reflector' },
  { id: 18645, name: 'Gnomish Alarm-O-Bot' },
  { id: 10506, name: 'Deepdive Helmet' },
];

// --- Cache ---

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, cachedAt, ttl } = JSON.parse(raw);
    if (Date.now() - cachedAt > ttl) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function cacheSet(key, data, ttl) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now(), ttl }));
  } catch (e) {
    console.warn('Cache write failed:', e.message);
  }
}

// --- Proxy fetch with multi-proxy fallback ---

async function proxyFetch(url) {
  for (const proxy of PROXIES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT);
      const resp = await fetch(proxy.wrap(url), { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) continue;
      const text = await proxy.extract(resp);
      if (text) return text;
    } catch {
      // try next proxy
    }
  }
  throw new Error('All proxies failed');
}

function extractJson(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const el = doc.querySelector('json');
  if (!el) throw new Error('No <json> block in WoWHead response');
  return JSON.parse(el.textContent);
}

// --- Fallback bundle ---

let _fallback = null;

async function loadFallback() {
  if (_fallback) return _fallback;
  try {
    const r = await fetch('./data/fallback.json');
    _fallback = await r.json();
  } catch {
    _fallback = { items: {}, recipes: {} };
  }
  return _fallback;
}

// --- Local search against static index + fallback bundle ---

async function localSearch(query) {
  const q = query.toLowerCase();
  const fb = await loadFallback();
  const seen = new Set();
  const results = [];

  // Fallback items first (have full recipe data)
  for (const item of Object.values(fb.items)) {
    if (item.name.toLowerCase().includes(q)) {
      seen.add(item.id);
      results.push({ id: item.id, name: item.name });
    }
  }
  // Then static index
  for (const item of VANILLA_ITEMS) {
    if (!seen.has(item.id) && item.name.toLowerCase().includes(q)) {
      results.push({ id: item.id, name: item.name });
    }
  }
  return results.slice(0, 12);
}

// --- Public API ---

export async function searchItems(query) {
  if (!query || query.length < 2) return [];
  const key = `wow-srch-${query.toLowerCase().trim()}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  // Always return local results immediately
  const local = await localSearch(query);

  // Try live search in background — if it returns more results, cache them
  // But don't block the UI on it
  try {
    const url = `${BASE}/search?q=${encodeURIComponent(query)}&usesearchv2=1&opensearch=1`;
    const text = await proxyFetch(url);
    const data = JSON.parse(text);
    if (Array.isArray(data) && data[1]) {
      const names = data[1] || [];
      const urls  = data[3] || [];
      const results = names.slice(0, 12).map((name, i) => {
        const m = (urls[i] || '').match(/item=(\d+)/);
        return m ? { id: Number(m[1]), name } : null;
      }).filter(Boolean);
      if (results.length > 0) {
        cacheSet(key, results, TTL_SEARCH);
        return results;
      }
    }
  } catch {
    // proxy unavailable — use local results
  }

  if (local.length > 0) cacheSet(key, local, TTL_SEARCH);
  return local;
}

export async function getItemData(itemId) {
  const key = `wow-item-${itemId}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  // nether API is CORS-enabled — no proxy needed, always works for name+icon
  let netherData = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`https://nether.wowhead.com/classic/tooltip/item/${itemId}`, { signal: controller.signal });
    clearTimeout(timer);
    if (resp.ok) {
      const d = await resp.json();
      if (d.name) netherData = { id: itemId, name: d.name, icon: d.icon };
    }
  } catch {}

  // Try proxy for full XML data (has createdBy/recipe)
  try {
    const url  = `${BASE}/item=${itemId}&xml`;
    const text = await proxyFetch(url);
    const data = extractJson(text);
    const merged = netherData ? { ...data, name: netherData.name, icon: netherData.icon } : data;
    cacheSet(key, merged, TTL_RECIPE);
    return merged;
  } catch (e) {
    console.warn(`getItemData(${itemId}) proxy failed:`, e.message);
  }

  // Fall back to bundled data
  const fb = await loadFallback();
  const fbItem = fb.items[String(itemId)];
  if (fbItem) {
    const result = netherData ? { ...fbItem, name: netherData.name, icon: netherData.icon } : fbItem;
    cacheSet(key, result, TTL_RECIPE);
    return result;
  }

  if (netherData) {
    cacheSet(key, netherData, TTL_RECIPE);
    return netherData;
  }

  return null;
}

export async function getRecipe(spellId) {
  const key = `wow-spell-${spellId}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  try {
    const url  = `${BASE}/spell=${spellId}&xml`;
    const text = await proxyFetch(url);
    const data = extractJson(text);
    const recipe = shapeRecipe(data);
    cacheSet(key, recipe, TTL_RECIPE);
    return recipe;
  } catch (e) {
    console.warn(`getRecipe(${spellId}) failed:`, e.message);
    const fb = await loadFallback();
    return fb.recipes[spellId] || null;
  }
}

function shapeRecipe(spellData) {
  const reagents = (spellData.reagents || []).map(entry => {
    const [id, qty] = Array.isArray(entry) ? entry : [entry.id, entry.count];
    const name = spellData.reagentData?.[id]?.name || `Item #${id}`;
    const icon = spellData.reagentData?.[id]?.icon || null;
    return { id, name, icon, quantity: qty, isCraftable: false };
  });
  const creates = spellData.creates || [];
  const skillId = spellData.skill?.[0]?.id;
  return {
    spellId: spellData.id,
    itemId: creates[0]?.[0] ?? null,
    produces: creates[0]?.[1] ?? 1,
    profession: SKILL_TO_PROFESSION[skillId] || 'Unknown',
    skillRequired: spellData.skill?.[0]?.minSkill ?? 0,
    reagents
  };
}

export function getProfessionFromSkillId(skillId) {
  return SKILL_TO_PROFESSION[skillId] || 'Unknown';
}

export function clearCache() {
  const keys = Object.keys(localStorage).filter(k =>
    k.startsWith('wow-srch-') || k.startsWith('wow-item-') || k.startsWith('wow-spell-')
  );
  keys.forEach(k => localStorage.removeItem(k));
  return keys.length;
}

export function getCacheStats() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('wow-'));
  return { entries: keys.length };
}

export function iconUrl(icon, size = 'small') {
  if (!icon) return '';
  return `https://wow.zamimg.com/images/wow/icons/${size}/${icon}.jpg`;
}
