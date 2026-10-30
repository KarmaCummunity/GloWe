// app/apps/mobile/src/components/admin/admins/layers/layerVisuals.ts
// FR-ADMIN-028 — visual language of the layered hierarchy view.
//
// Each stratum gets an icon, an accent and a relative width. Widths grow from
// the top stratum to the base so the stack reads as a pyramid on wide screens;
// on phones every band is full-width and the taper is carried by the indent.
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { HierarchyTier } from '@kc/domain';

export type LayerIconName = ComponentProps<typeof Ionicons>['name'];

export interface TierVisual {
  readonly icon: LayerIconName;
  readonly accent: string;
  /** Band width on wide screens, as a percentage of the column. */
  readonly widePct: number;
}

/** Accents follow `RoleBadge` hues so a band and its role pills agree. */
export const TIER_VISUALS: Readonly<Record<HierarchyTier, TierVisual>> = {
  leadership:     { icon: 'shield-checkmark', accent: '#7c3aed', widePct: 56 },
  platform_staff: { icon: 'construct',        accent: '#2563eb', widePct: 67 },
  org_leadership: { icon: 'business',         accent: '#ca8a04', widePct: 78 },
  org_team:       { icon: 'briefcase',        accent: '#0d9488', widePct: 89 },
  volunteers:     { icon: 'heart',            accent: '#dc2626', widePct: 100 },
};

/** Phone indent per step down from the base, in px (top band is most inset). */
export const PHONE_TAPER_STEP = 6;

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
