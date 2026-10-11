import { fr } from './fr';

export type MessageKey = keyof typeof fr;

export function t(key: MessageKey): string {
  return fr[key];
}

export { fr };
