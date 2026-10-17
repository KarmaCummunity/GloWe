// Hebrew — marketplace world labels + external-organisation picker copy.
// Extracted from `donations.ts` (300-LOC cap). Composed into `marketplace.world` / `marketplace.orgPicker`.

export const marketplaceWorldLabels = {
  money: 'כסף',
  time: 'זמן',
  items: 'חפצים',
  food: 'מזון',
  rides: 'נסיעות',
  housing: 'דיור',
  knowledge: 'ידע',
  medical: 'דם ורפואה',
  animals: 'חיות',
  environment: 'סביבה',
} as const;

export const marketplaceOrgPicker = {
  label: 'ארגון מאומת',
  hint: 'בעולם זה מפרסמים דרך ארגון מאומת. בחרו את הארגון שיטפל בפנייה.',
  title: 'בחירת ארגון',
  placeholder: 'חיפוש ארגון…',
  empty: 'לא נמצאו ארגונים מאומתים.',
  error: 'טעינת הארגונים נכשלה.',
  required: 'יש לבחור ארגון מאומת לפני הפרסום.',
} as const;
