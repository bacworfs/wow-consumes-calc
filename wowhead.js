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

// Static search index — covers all common vanilla consumables
// Used when live proxy is unavailable
const VANILLA_ITEMS = [
  // Alchemy — Flasks
  { id: 13510, name: 'Flask of the Titans' },
  { id: 13511, name: 'Flask of Distilled Wisdom' },
  { id: 13512, name: 'Flask of Supreme Power' },
  { id: 13513, name: 'Flask of Chromatic Resistance' },
  // Alchemy — Major potions
  { id: 13446, name: 'Major Healing Potion' },
  { id: 13444, name: 'Major Mana Potion' },
  { id: 13442, name: 'Mighty Rage Potion' },
  // Alchemy — Elixirs
  { id: 13452, name: 'Elixir of the Mongoose' },
  { id: 9030,  name: 'Elixir of Fortitude' },
  { id: 9187,  name: 'Elixir of Giants' },
  { id: 9088,  name: 'Elixir of Superior Defense' },
  { id: 6662,  name: 'Elixir of Agility' },
  { id: 13451, name: 'Elixir of Brute Force' },
  { id: 11406, name: 'Elixir of Demonslaying' },
  { id: 9264,  name: 'Elixir of Shadow Power' },
  { id: 13447, name: 'Greater Arcane Elixir' },
  { id: 13494, name: 'Elixir of Greater Firepower' },
  // Alchemy — Standard potions
  { id: 3928,  name: 'Superior Healing Potion' },
  { id: 1710,  name: 'Greater Healing Potion' },
  { id: 6149,  name: 'Greater Mana Potion' },
  { id: 3825,  name: 'Mana Potion' },
  { id: 5634,  name: 'Free Action Potion' },
  { id: 3387,  name: 'Limited Invulnerability Potion' },
  { id: 13445, name: 'Swiftness Potion' },
  // Alchemy — Protection potions
  { id: 13457, name: 'Greater Fire Protection Potion' },
  { id: 13458, name: 'Greater Nature Protection Potion' },
  { id: 13456, name: 'Greater Frost Protection Potion' },
  { id: 13459, name: 'Greater Shadow Protection Potion' },
  { id: 13461, name: 'Greater Arcane Protection Potion' },
  { id: 6052,  name: 'Fire Protection Potion' },
  { id: 6048,  name: 'Nature Protection Potion' },
  { id: 6050,  name: 'Frost Protection Potion' },
  { id: 6051,  name: 'Shadow Protection Potion' },
  // Cooking
  { id: 13928, name: 'Grilled Squid' },
  { id: 13931, name: 'Nightfin Soup' },
  { id: 13810, name: 'Runn Tum Tuber Surprise' },
  { id: 12217, name: 'Dragonbreath Chili' },
  { id: 17222, name: 'Tender Wolf Steak' },
  { id: 21217, name: 'Dirge\'s Kickin\' Chimaerok Chops' },
  { id: 8950,  name: 'Mithril Head Trout' },
  { id: 20452, name: 'Smoked Desert Dumplings' },
  { id: 13851, name: 'Monster Omelet' },
  { id: 13899, name: 'Tender Wolf Steak' },
  { id: 12209, name: 'Blessed Sunfruit' },
  // First Aid
  { id: 14530, name: 'Heavy Runecloth Bandage' },
  { id: 9741,  name: 'Runecloth Bandage' },
  { id: 8545,  name: 'Mageweave Bandage' },
  { id: 6451,  name: 'Heavy Mageweave Bandage' },
  { id: 3530,  name: 'Heavy Silk Bandage' },
  { id: 1251,  name: 'Linen Bandage' },
  // Engineering — Explosives
  { id: 4604,  name: 'Goblin Sapper Charge' },
  { id: 18641, name: 'Dark Iron Bomb' },
  { id: 15993, name: 'Dense Dynamite' },
  { id: 15810, name: 'Thorium Grenade' },
  { id: 10506, name: 'Hi-Explosive Bomb' },
  { id: 4403,  name: 'Big Iron Bomb' },
  // Engineering — Devices
  { id: 10646, name: 'Goblin Rocket Helmet' },
  { id: 18984, name: 'Arcanite Dragonling' },
  { id: 11828, name: 'Mechanical Dragonling' },
  { id: 10727, name: 'Gnomish Battle Chicken' },
  { id: 18587, name: 'Thorium Widget' },
  { id: 10577, name: 'Lovingly Crafted Boomstick' },
  // Engineering — Trinkets/Utility
  { id: 18594, name: 'Core Marksman Rifle' },
  { id: 18698, name: 'Force Reactive Disk' },
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

  try {
    const url  = `${BASE}/item=${itemId}&xml`;
    const text = await proxyFetch(url);
    const data = extractJson(text);
    cacheSet(key, data, TTL_RECIPE);
    return data;
  } catch (e) {
    console.warn(`getItemData(${itemId}) failed:`, e.message);
    const fb = await loadFallback();
    return fb.items[itemId] || null;
  }
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
