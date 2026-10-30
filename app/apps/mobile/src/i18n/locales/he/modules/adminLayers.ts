// app/apps/mobile/src/i18n/locales/he/modules/adminLayers.ts
// Hebrew strings for the layered hierarchy view of the admin team (FR-ADMIN-028).
export const adminLayersHe = {
  tiers: {
    leadership:     { title: 'הנהלת הפלטפורמה', hint: 'מנהל-העל של קארמה קומיוניטי' },
    platform_staff: { title: 'צוות הפלטפורמה',  hint: 'מנחים, תמיכה ומוקדנים ארציים' },
    org_leadership: { title: 'הנהלות ארגונים',  hint: 'מנהלי ארגונים ומנהלים בארגון' },
    org_team:       { title: 'צוותי ארגונים',   hint: 'עובדים, מנהלי מתנדבים ומוקדנים בארגון' },
    volunteers:     { title: 'מתנדבים',          hint: 'מתנדבים בעלי תפקיד מוגדר בארגון' },
  },
  community: {
    title:      'הקהילה',
    hint:       'כל המשתמשים הפעילים ללא תפקיד. הזהויות מוסתרות — מוצגת ספירה בלבד.',
    masked:     (n: number) => `${n} חברי קהילה`,
    affiliated: (n: number) => `${n} מתנדבים משויכים (בהצהרה עצמית)`,
  },
  stats: {
    community:   'חברי קהילה',
    roleHolders: 'בעלי תפקידים',
    orgs:        'ארגונים',
    affiliated:  'מתנדבים משויכים',
  },
  emptyTier:   'אין בעלי תפקידים בשכבה זו.',
  showMore:    (n: number) => `+${n} נוספים`,
  showLess:    'הצג פחות',
  verified:    'ארגון מאומת',
  moreRoles:   (n: number) => `+${n}`,
  loadError:   'טעינת מבנה ההיררכיה נכשלה.',
  retry:       'נסה שוב',
  personA11y:  (name: string, role: string, org: string) => `${name}, ${role}, ${org}`,
  headcountA11y: (n: number) => `${n} אנשים בשכבה`,
} as const;
