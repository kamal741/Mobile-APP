/** E.164 pattern aligned with EstateFlow RegisterAgentRequest.mobile */
const E164 = /^\+[1-9]\d{1,14}$/;

const LOOSE_EMAIL = /\S+@\S+\.\S+/;

export function isValidE164(mobile: string): boolean {
  return E164.test(mobile.trim());
}

/** Portal login: email or international phone (E.164). */
export function isValidLoginIdentifier(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (E164.test(t)) return true;
  return LOOSE_EMAIL.test(t);
}

/** Returns trimmed E.164 or null if blank / invalid (optional fields). */
export function toOptionalPhoneE164(phone: string): string | null {
  const t = phone.trim();
  if (!t) return null;
  return E164.test(t) ? t : null;
}
