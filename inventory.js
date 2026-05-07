import { userKey } from './user.js';

function key() { return userKey('inventory'); }

function load() {
  try { return JSON.parse(localStorage.getItem(key()) || '{}'); }
  catch { return {}; }
}

function save(inv) {
  localStorage.setItem(key(), JSON.stringify(inv));
}

export function setInventory(itemId, qty) {
  const inv = load();
  const n = Number(qty);
  if (!n || n <= 0) delete inv[itemId];
  else inv[itemId] = n;
  save(inv);
}

export function getInventory(itemId) {
  return load()[String(itemId)] || load()[Number(itemId)] || 0;
}

export function getAll() {
  return load();
}

export function clearInventory() {
  localStorage.removeItem(key());
}

export function applyToMaterials(materials) {
  const inv = load();
  return materials.map(m => {
    const onHand = inv[m.id] || 0;
    const needed = Math.max(0, m.quantity - onHand);
    return { ...m, onHand, needed, isSatisfied: needed === 0 };
  });
}
