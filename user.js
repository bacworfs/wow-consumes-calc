const USER_KEY = 'wow-calc-user';

let _user = null;

export function getUser() {
  if (!_user) _user = localStorage.getItem(USER_KEY) || null;
  return _user;
}

export function setUser(name) {
  _user = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'default';
  localStorage.setItem(USER_KEY, _user);
  return _user;
}

export function clearUser() {
  _user = null;
  localStorage.removeItem(USER_KEY);
}

export function userKey(suffix) {
  return `wow-${getUser() || 'default'}-${suffix}`;
}
