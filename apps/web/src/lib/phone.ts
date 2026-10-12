const E164 = /^\+[1-9][0-9]{7,14}$/;
const SN_MOBILE = /^7[05678][0-9]{7}$/;

/**
 * Convertit une saisie en E.164 (+221771234567), ou `null` si elle est invalide.
 * Un numéro à 9 chiffres est pris pour un mobile sénégalais (70, 75, 76, 77, 78).
 */
export function normalizePhone(input: string): string | null {
  let s = input.replace(/[\s.\-()]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  else if (/^221[0-9]{9}$/.test(s)) s = `+${s}`;
  else if (/^[0-9]{9}$/.test(s)) s = `+221${s}`;
  if (!E164.test(s)) return null;
  if (s.startsWith('+221') && !SN_MOBILE.test(s.slice(4))) return null;
  return s;
}

/** Affichage : +221771234567 → 77 123 45 67 (conventions.md). */
export function formatPhone(e164: string): string {
  const m = /^\+221([0-9]{2})([0-9]{3})([0-9]{2})([0-9]{2})$/.exec(e164);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}
