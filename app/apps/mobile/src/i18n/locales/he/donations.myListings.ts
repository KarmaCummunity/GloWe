// Hebrew — "My listings" screen copy (marketplace).
// Extracted from `donations.ts` (300-LOC cap). Spread into `marketplace` so keys stay `marketplace.myListings*`.

export const marketplaceMyListings = {
  myListingsNav: 'המודעות שלי',
  myListingsTitle: 'המודעות שלי',
  myListingsSubtitle: 'עריכה, השהיה, סימון כהושלם או מחיקה. השלמה מעניקה קארמה.',
  myListingsEmpty: 'אין לך מודעות עדיין.',
  myListingsEdit: 'עריכה',
  myListingsPause: 'השהיה',
  myListingsResume: 'חידוש',
  myListingsFulfill: 'סימון כהושלם',
  myListingsFulfillTitle: 'לסמן כהושלם?',
  myListingsFulfillHint: 'המודעה תיסגר ותקבלו נקודות קארמה על השלמת נתינה/בקשה.',
  myListingsDelete: 'מחיקה',
  myListingsDeleteTitle: 'למחוק את המודעה?',
  myListingsDeleteHint: 'המודעה תימחק לצמיתות.',
  myListingsSave: 'שמירת שינויים',
  myListingsUpdated: 'עודכן {{date}}',
  myListingsHiddenHint: 'מוסתרת מאחרים עד שהצוות יבדוק את הדיווחים',
} as const;
