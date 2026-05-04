import { searchItems, getItemData, clearCache, getCacheStats, iconUrl } from './wowhead.js';
import { resolveItem, setCraftToggle, getCraftToggle } from './resolver.js';
import { setInventory, getInventory, clearInventory, applyToMaterials } from './inventory.js';

// --- State ---
let selectedItem = null;
let currentMaterials = [];
let queue = loadQueue();
let debounceTimer = null;

// --- DOM refs ---
const searchInput      = document.getElementById('search-input');
const autocompleteEl   = document.getElementById('autocomplete');
const itemSection      = document.getElementById('item-section');
const itemIcon         = document.getElementById('item-icon');
const itemNameEl       = document.getElementById('item-name');
const itemProfession   = document.getElementById('item-profession');
const quantityInput    = document.getElementById('quantity-input');
const loadingEl        = document.getElementById('loading');
const materialsSection = document.getElementById('materials-section');
const materialList     = document.getElementById('material-list');
const shoppingSection  = document.getElementById('shopping-section');
const shoppingList     = document.getElementById('shopping-list');
const queueSection     = document.getElementById('queue-section');
const queueListEl      = document.getElementById('queue-list');
const cacheStatsEl     = document.getElementById('cache-stats');

// --- Init ---
updateCacheStats();
renderQueue();

// --- Search ---
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = searchInput.value.trim();
  if (!q || q.length < 2) { hideAutocomplete(); return; }
  debounceTimer = setTimeout(() => doSearch(q), 300);
});

searchInput.addEventListener('keydown', e => {
  const items = autocompleteEl.querySelectorAll('.autocomplete-item');
  const active = autocompleteEl.querySelector('.autocomplete-item.active');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = active ? active.nextElementSibling : items[0];
    if (next) { active?.classList.remove('active'); next.classList.add('active'); }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = active?.previousElementSibling;
    if (prev) { active.classList.remove('active'); prev.classList.add('active'); }
  } else if (e.key === 'Enter') {
    if (active) { active.click(); }
  } else if (e.key === 'Escape') {
    hideAutocomplete();
  }
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) hideAutocomplete();
});

async function doSearch(query) {
  const results = await searchItems(query);
  renderAutocomplete(results);
}

function renderAutocomplete(results) {
  autocompleteEl.innerHTML = '';
  if (!results.length) { hideAutocomplete(); return; }
  results.forEach(item => {
    const el = document.createElement('div');
    el.className = 'autocomplete-item';
    el.innerHTML = `
      <span class="autocomplete-item-name">${item.name}</span>
      <span class="autocomplete-item-id">#${item.id}</span>
    `;
    el.addEventListener('click', () => selectItem(item));
    autocompleteEl.appendChild(el);
  });
  autocompleteEl.classList.remove('hidden');
}

function hideAutocomplete() {
  autocompleteEl.classList.add('hidden');
  autocompleteEl.innerHTML = '';
}

// --- Item selection ---
async function selectItem(item) {
  hideAutocomplete();
  searchInput.value = item.name;
  selectedItem = item;

  // Get full item data for icon + profession
  const data = await getItemData(item.id);
  const icon = data?.icon || null;
  const recipeRef = data?.createdBy?.[0];
  const skillId = recipeRef?.skill?.[0]?.id;
  const profName = skillId ? SKILL_MAP[skillId] : null;

  itemIcon.src = icon ? iconUrl(icon, 'large') : '';
  itemIcon.alt = item.name;
  itemNameEl.textContent = item.name;
  itemNameEl.href = `https://www.wowhead.com/classic/item=${item.id}`;
  setProfessionBadge(itemProfession, profName);
  quantityInput.value = 1;
  itemSection.classList.remove('hidden');

  await calculate();
}

function setProfessionBadge(el, prof) {
  el.textContent = prof || 'Raw Material';
  el.className = 'profession-badge ' + profClass(prof);
}

const SKILL_MAP = {
  171: 'Alchemy', 164: 'Blacksmithing', 333: 'Enchanting',
  202: 'Engineering', 165: 'Leatherworking', 197: 'Tailoring',
  185: 'Cooking', 129: 'First Aid'
};

function profClass(prof) {
  if (!prof) return 'prof-raw';
  return 'prof-' + prof.toLowerCase().replace(/\s+/g, '-');
}

// --- Quantity ---
quantityInput.addEventListener('change', () => { if (selectedItem) calculate(); });
document.getElementById('qty-up').addEventListener('click', () => {
  quantityInput.value = Math.min(9999, Number(quantityInput.value) + 1);
  if (selectedItem) calculate();
});
document.getElementById('qty-down').addEventListener('click', () => {
  quantityInput.value = Math.max(1, Number(quantityInput.value) - 1);
  if (selectedItem) calculate();
});

// --- Core calculate ---
async function calculate() {
  if (!selectedItem) return;
  const qty = Math.max(1, Number(quantityInput.value) || 1);

  loadingEl.classList.remove('hidden');
  materialsSection.classList.add('hidden');
  shoppingSection.classList.add('hidden');

  try {
    const raw = await resolveItem(selectedItem.id, qty);
    currentMaterials = applyToMaterials(raw);
    renderMaterials(currentMaterials);
    renderShopping(currentMaterials);
  } catch (e) {
    console.error('calculate failed:', e);
    materialList.innerHTML = `<div style="padding:16px;color:var(--red)">Failed to load recipe data. Check console for details.</div>`;
    materialsSection.classList.remove('hidden');
  } finally {
    loadingEl.classList.add('hidden');
  }
}

// --- Render materials ---
function renderMaterials(materials) {
  materialList.innerHTML = '';
  materials.forEach(m => {
    const row = document.createElement('div');
    row.className = 'material-row' + (m.isSatisfied ? ' satisfied' : '');
    row.dataset.id = m.id;

    const icon = m.icon ? `<img class="material-icon" src="${iconUrl(m.icon)}" alt="${m.name}" onerror="this.style.visibility='hidden'">` : '<div class="material-icon"></div>';
    const craftBtn = m.isCraftable
      ? `<button class="craft-toggle ${getCraftToggle(m.id) ? 'crafting' : ''}" data-id="${m.id}">${getCraftToggle(m.id) ? 'Craft' : 'Buy'}</button>`
      : '<span style="color:var(--text-muted);font-size:11px">Raw</span>';

    row.innerHTML = `
      <div class="material-item">
        ${icon}
        <div class="material-name-wrap">
          <a class="material-name" href="https://www.wowhead.com/classic/item=${m.id}" target="_blank" rel="noopener">${m.name}</a>
          <span class="profession-badge ${profClass(m.profession)}" style="font-size:10px">${m.profession || 'Raw'}</span>
        </div>
      </div>
      <div class="material-qty">${m.quantity}</div>
      <input type="number" class="on-hand-input" value="${m.onHand || ''}" min="0" placeholder="0" data-id="${m.id}">
      <div class="still-need ${m.needed === 0 ? 'zero' : 'nonzero'}">${m.needed === 0 ? '✓' : m.needed}</div>
      <div>${craftBtn}</div>
    `;
    materialList.appendChild(row);
  });

  // Inventory inputs
  materialList.querySelectorAll('.on-hand-input').forEach(input => {
    input.addEventListener('input', () => {
      setInventory(Number(input.dataset.id), Number(input.value));
      refreshNeeded();
    });
  });

  // Craft toggles
  materialList.querySelectorAll('.craft-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const current = getCraftToggle(id);
      setCraftToggle(id, !current);
      calculate(); // full recalculate
    });
  });

  materialsSection.classList.remove('hidden');
}

function refreshNeeded() {
  currentMaterials = applyToMaterials(currentMaterials);
  currentMaterials.forEach(m => {
    const row = materialList.querySelector(`.material-row[data-id="${m.id}"]`);
    if (!row) return;
    row.classList.toggle('satisfied', m.isSatisfied);
    const needEl = row.querySelector('.still-need');
    if (needEl) {
      needEl.textContent = m.needed === 0 ? '✓' : m.needed;
      needEl.className = 'still-need ' + (m.needed === 0 ? 'zero' : 'nonzero');
    }
  });
  renderShopping(currentMaterials);
}

// --- Shopping list ---
function renderShopping(materials) {
  const needed = materials.filter(m => !m.isSatisfied);
  shoppingList.innerHTML = '';

  if (!needed.length) {
    shoppingList.innerHTML = '<div class="shopping-empty">&#10003; You have everything you need!</div>';
  } else {
    needed.forEach(m => {
      const el = document.createElement('div');
      el.className = 'shopping-item';
      const icon = m.icon ? `<img class="shopping-icon" src="${iconUrl(m.icon)}" alt="" onerror="this.style.visibility='hidden'">` : '';
      el.innerHTML = `
        ${icon}
        <span class="shopping-name">${m.name}</span>
        <span class="shopping-qty">x${m.needed}</span>
      `;
      shoppingList.appendChild(el);
    });
  }
  shoppingSection.classList.remove('hidden');
}

// --- Copy to clipboard ---
document.getElementById('copy-list-btn').addEventListener('click', () => {
  const needed = currentMaterials.filter(m => !m.isSatisfied);
  if (!needed.length) return;
  const text = needed.map(m => `${m.name} x${m.needed}`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-list-btn');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
});

// --- Clear inventory ---
document.getElementById('clear-inventory-btn').addEventListener('click', () => {
  clearInventory();
  materialList.querySelectorAll('.on-hand-input').forEach(i => { i.value = ''; });
  currentMaterials = applyToMaterials(currentMaterials);
  refreshNeeded();
});

// --- Queue ---
document.getElementById('add-queue-btn').addEventListener('click', () => {
  if (!selectedItem) return;
  const qty = Math.max(1, Number(quantityInput.value) || 1);
  const existing = queue.find(q => q.id === selectedItem.id);
  if (existing) { existing.quantity += qty; }
  else { queue.push({ id: selectedItem.id, name: selectedItem.name, icon: selectedItem.icon || null, quantity: qty }); }
  saveQueue();
  renderQueue();
  calculateQueue();
});

document.getElementById('clear-queue-btn').addEventListener('click', () => {
  queue = [];
  saveQueue();
  renderQueue();
  materialsSection.classList.add('hidden');
  shoppingSection.classList.add('hidden');
});

function renderQueue() {
  if (!queue.length) { queueSection.classList.add('hidden'); return; }
  queueSection.classList.remove('hidden');
  queueListEl.innerHTML = '';
  queue.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'queue-item';
    el.innerHTML = `
      <span class="queue-item-name">${item.name}</span>
      <input type="number" class="queue-qty-input" value="${item.quantity}" min="1" data-idx="${i}">
      <button class="queue-remove" data-idx="${i}">Remove</button>
    `;
    queueListEl.appendChild(el);
  });

  queueListEl.querySelectorAll('.queue-qty-input').forEach(input => {
    input.addEventListener('change', () => {
      const idx = Number(input.dataset.idx);
      queue[idx].quantity = Math.max(1, Number(input.value) || 1);
      saveQueue();
      calculateQueue();
    });
  });

  queueListEl.querySelectorAll('.queue-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      queue.splice(Number(btn.dataset.idx), 1);
      saveQueue();
      renderQueue();
      calculateQueue();
    });
  });
}

async function calculateQueue() {
  if (!queue.length) return;
  loadingEl.classList.remove('hidden');
  materialsSection.classList.add('hidden');
  shoppingSection.classList.add('hidden');
  try {
    const allMaterials = [];
    for (const item of queue) {
      const raw = await resolveItem(item.id, item.quantity);
      allMaterials.push(...raw);
    }
    // Merge across queue items
    const merged = mergeMaterials(allMaterials);
    currentMaterials = applyToMaterials(merged);
    renderMaterials(currentMaterials);
    renderShopping(currentMaterials);
  } catch (e) {
    console.error('calculateQueue failed:', e);
  } finally {
    loadingEl.classList.add('hidden');
  }
}

function mergeMaterials(materials) {
  const map = new Map();
  for (const m of materials) {
    if (map.has(m.id)) map.get(m.id).quantity += m.quantity;
    else map.set(m.id, { ...m });
  }
  return Array.from(map.values());
}

function saveQueue() {
  localStorage.setItem('wow-calc-queue', JSON.stringify(queue));
}

function loadQueue() {
  try { return JSON.parse(localStorage.getItem('wow-calc-queue') || '[]'); }
  catch { return []; }
}

// --- Cache ---
document.getElementById('clear-cache-btn').addEventListener('click', () => {
  const n = clearCache();
  updateCacheStats();
  const btn = document.getElementById('clear-cache-btn');
  btn.textContent = `Cleared ${n} entries`;
  setTimeout(() => { btn.textContent = 'Clear Cache'; }, 2000);
});

function updateCacheStats() {
  const { entries } = getCacheStats();
  cacheStatsEl.textContent = entries ? `${entries} cached` : '';
}
