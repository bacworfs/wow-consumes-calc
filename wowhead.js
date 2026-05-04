const PROXY = 'https://api.allorigins.win/get?url=';
const BASE   = 'https://www.wowhead.com/classic';
const TTL_SEARCH = 24 * 60 * 60 * 1000;
const TTL_RECIPE =  7 * 24 * 60 * 60 * 1000;

const SKILL_TO_PROFESSION = {
  171: 'Alchemy', 164: 'Blacksmithing', 333: 'Enchanting',
  202: 'Engineering', 165: 'Leatherworking', 197: 'Tailoring',
  185: 'Cooking', 129: 'First Aid'
};

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

// --- WoWHead fetch ---

async function proxyFetch(url) {
  const resp = await fetch(`${PROXY}${encodeURIComponent(url)}`);
  if (!resp.ok) throw new Error(`Proxy HTTP ${resp.status}`);
  const { contents } = await resp.json();
  if (!contents) throw new Error('Empty proxy response');
  return contents;
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

// --- Public API ---

export async function searchItems(query) {
  if (!query || query.length < 2) return [];
  const key = `wow-srch-${query.toLowerCase().trim()}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  try {
    const url = `${BASE}/search?q=${encodeURIComponent(query)}&usesearchv2=1&opensearch=1`;
    const text = await proxyFetch(url);
    const data = JSON.parse(text);
    const names = data[1] || [];
    const urls  = data[3] || [];
    const results = names.slice(0, 12).map((name, i) => {
      const m = (urls[i] || '').match(/item=(\d+)/);
      return m ? { id: Number(m[1]), name } : null;
    }).filter(Boolean);
    cacheSet(key, results, TTL_SEARCH);
    return results;
  } catch (e) {
    console.warn('searchItems live failed, trying fallback:', e.message);
    const fb = await loadFallback();
    const q  = query.toLowerCase();
    return Object.values(fb.items)
      .filter(i => i.name.toLowerCase().includes(q))
      .map(i => ({ id: i.id, name: i.name }));
  }
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
