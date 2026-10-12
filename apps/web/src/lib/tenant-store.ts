const KEY = 'laquinc.activeTenant';

export interface TenantStore {
  get(): string | null;
  set(id: string | null): void;
}

/** Quincaillerie active mémorisée dans le navigateur (confort seulement : l'API revérifie chaque requête). */
export const localTenantStore: TenantStore = {
  get() {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(id) {
    try {
      if (id) window.localStorage.setItem(KEY, id);
      else window.localStorage.removeItem(KEY);
    } catch {
      /* stockage indisponible : l'utilisateur rechoisira */
    }
  },
};
