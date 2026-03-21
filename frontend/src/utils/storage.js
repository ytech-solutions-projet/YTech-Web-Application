export const AUTH_CHANGE_EVENT = 'ytech-auth-change';

const notifyAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

export const readJsonStorage = (key, fallback) => {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) {
      return fallback;
    }

    const parsedValue = JSON.parse(rawValue);

    return parsedValue ?? fallback;
  } catch (error) {
    console.warn(`Impossible de lire la cle ${key} depuis le stockage local.`, error);
    return fallback;
  }
};

export const writeJsonStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Impossible d'enregistrer la cle ${key} dans le stockage local.`, error);
    return false;
  }
};

export const removeStorageKey = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Impossible de supprimer la cle ${key} du stockage local.`, error);
    return false;
  }
};

export const buildAuthUser = (user = {}) => {
  return {
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    company: user.company || '',
    role: user.role || 'client'
  };
};

export const writeAuthSession = ({ user }) => {
  try {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify(buildAuthUser(user)));
    notifyAuthChange();
    return true;
  } catch (error) {
    console.error("Impossible d'enregistrer la session locale.", error);
    return false;
  }
};

export const clearAuthSession = () => {
  try {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    notifyAuthChange();
    return true;
  } catch (error) {
    console.error("Impossible de nettoyer la session locale.", error);
    return false;
  }
};

export const readAuthUser = () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const user = readJsonStorage('user', null);

  if (!isLoggedIn || !user) {
    return null;
  }

  return user;
};
