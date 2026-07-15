import type { Answers, ScreenDef } from '../types/preferences';
import { buildPreferencesPayload } from './buildPayload';

function tierLayoutSnapshot(screens: ScreenDef[]): { key: string; tier: string }[] {
  const tiers: { key: string; tier: string }[] = [];
  for (const screen of screens) {
    for (const field of screen.fields) {
      if (field.key === 'budget_range') {
        tiers.push({ key: 'min_budget', tier: screen.key });
        tiers.push({ key: 'max_budget', tier: screen.key });
      } else {
        tiers.push({ key: field.key, tier: screen.key });
      }
    }
  }
  return tiers.sort((a, b) => a.key.localeCompare(b.key));
}

/** Stable JSON for comparing current form state vs last saved/loaded baseline. */
export function preferencesStateSnapshot(
  answers: Answers,
  screens: ScreenDef[],
): string {
  const values = buildPreferencesPayload(answers, screens, 0).items
    .map(({ key, tier, value, sortOrder }) => ({ key, tier, value, sortOrder }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return JSON.stringify({
    tiers: tierLayoutSnapshot(screens),
    values,
  });
}
