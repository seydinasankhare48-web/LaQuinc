import { fr } from './fr';

export type MessageKey = keyof typeof fr;

/** Texte français ; `{nom}` est remplacé par la valeur correspondante de `params`. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const message: string = fr[key];
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

/** Message d'une erreur de l'API (`error.<CODE>`), ou le message générique. */
export function tError(code: string | undefined): string {
  const key = `error.${code ?? ''}`;
  return key in fr ? fr[key as MessageKey] : fr['error.INTERNAL_ERROR'];
}

export { fr };
