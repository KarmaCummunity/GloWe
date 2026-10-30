// app/apps/mobile/src/components/admin/admins/layers/layerVisuals.ts
// FR-ADMIN-028 — visual language of the layered hierarchy view.
//
// The number of levels follows the reporting chain, so every visual is derived
// from a level's position rather than looked up per fixed stratum: bands widen
// from the top level to the base (a pyramid on wide screens, a gentle inset on
// phones), accents walk a ramp by depth, and the icon names the top role.
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { AdminRole } from '@kc/domain';

export type LayerIconName = ComponentProps<typeof Ionicons>['name'];

/** Icon per role; a band shows the icon of its highest role. Exhaustive by type. */
export const ROLE_ICON: Readonly<Record<AdminRole, LayerIconName>> = {
  super_admin:       'shield-checkmark',
  moderator:         'construct',
  support:           'chatbubbles',
  operators_manager: 'headset',
  operator:          'call',
  org_admin:         'business',
  org_manager:       'people',
  volunteer_manager: 'hand-left',
  org_employee:      'briefcase',
  org_volunteer:     'heart',
};

/** Accent ramp by depth; levels deeper than the ramp reuse it from the start. */
const LEVEL_ACCENTS: readonly string[] = [
  '#7c3aed', '#2563eb', '#ca8a04', '#d97706', '#0d9488', '#dc2626', '#db2777', '#65a30d',
];

export function layerAccent(level: number): string {
  return LEVEL_ACCENTS[level % LEVEL_ACCENTS.length] ?? '#475569';
}

/** Narrowest band width on wide screens, as a percentage of the column. */
const TOP_BAND_PCT = 50;

/** Wide-screen width of the band at `index` of `total`, growing linearly to 100%. */
export function layerWidePct(index: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round(TOP_BAND_PCT + ((100 - TOP_BAND_PCT) * (index + 1)) / total);
}

/** Phone indent per step up from the base, in px. */
const PHONE_TAPER_STEP = 6;
/** Indent cap, so a deep chain never squeezes the top bands on a phone. */
const PHONE_TAPER_MAX_STEPS = 5;

/** Phone horizontal inset of the band at `index` of `total` (top band most inset). */
export function layerPhoneInset(index: number, total: number): number {
  return Math.min(total - index, PHONE_TAPER_MAX_STEPS) * PHONE_TAPER_STEP;
}

/** Distinct, theme-neutral hues for non-platform orgs, assigned in list order. */
const ORG_PALETTE: readonly string[] = [
  '#2563eb', '#16a34a', '#db2777', '#0891b2',
  '#9333ea', '#ea580c', '#0d9488', '#65a30d',
];

/**
 * Stable accent per org. The platform org wears the brand colour; other orgs
 * take palette hues in census order (platform first, then by name), so the
 * same org keeps its colour while the list is unchanged.
 */
export function buildOrgAccents(
  orgs: readonly { readonly orgId: string; readonly isPlatform: boolean }[],
  brand: string,
): ReadonlyMap<string, string> {
  const accents = new Map<string, string>();
  let next = 0;
  for (const org of orgs) {
    if (org.isPlatform) {
      accents.set(org.orgId, brand);
    } else {
      accents.set(org.orgId, ORG_PALETTE[next % ORG_PALETTE.length] ?? brand);
      next += 1;
    }
  }
  return accents;
}
