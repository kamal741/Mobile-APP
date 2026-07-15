/** Build a display label from profile name fields. */
export function formatClientDisplayName(
  firstName?: string | null,
  lastName?: string | null
): string {
  return [firstName, lastName].filter((p) => p != null && String(p).trim()).join(' ').trim();
}

/** Resolve {@code clientProfileId} from notification messageArgs using a preloaded map. */
export function clientDisplayNameFromMap(
  clientProfileId: unknown,
  namesByProfileId: Record<string, string> | undefined
): string | null {
  if (clientProfileId == null || !namesByProfileId) {
    return null;
  }
  const key = String(clientProfileId);
  const name = namesByProfileId[key]?.trim();
  return name || null;
}
