// FR-POST-001 AC6 — strings of the unified create form (category picker, request / offer,
// listing-form copy). Field and option labels live in donations.marketplaceFields.ts.
export const postUnifiedCreateHe = {
  unifiedCreate: {
    categoryLabel: 'קטגוריה',
    categories: {
      items: 'חפצים',
      rides: 'טרמפים',
      food: 'אוכל',
      housing: 'דיור',
      time: 'זמן',
    },
    request: 'לבקש',
    offer: 'להציע',
    cityLabel: 'עיר',
    pickDate: 'בחירת תאריך ושעה',
    amountPlaceholder: 'עד {{max}} ₪',
    inMinutes: { 30: 'בעוד חצי שעה', 60: 'בעוד שעה' },
    duration: { 30: 'חצי שעה', 60: 'שעה', 120: 'שעתיים', 180: '3 שעות', 240: '4 שעות' },
    titlePlaceholder: {
      rides: 'למשל: נסיעה מלוד לתל אביב',
      food: 'למשל: מגש פסטה ביתית',
      housing: 'למשל: חדר פנוי לסוף השבוע',
      time: 'למשל: עזרה בקניות',
    },
    noPermission: {
      housing: {
        title: 'פרסום בדיור דורש אימות זהות',
        body: 'כדי לשמור על הבטיחות של מארחים ואורחים, הצעה או בקשה לאירוח מתפרסמת רק אחרי אימות זהות של שני הצדדים. האימות יגיע בקרוב — בינתיים אפשר לעיין במידע ובקישורים בעולם הדיור.',
      },
      default: {
        title: 'אין אפשרות לפרסם כאן כרגע',
        body: 'החשבון שלך עדיין לא יכול לפרסם בעולם הזה. אם נראה לך שזו טעות, אפשר לפנות אלינו בהגדרות.',
      },
    },
    errors: {
      titleRequired: 'נא לכתוב כותרת (לפחות 2 תווים)',
      fieldRequired: 'נא למלא: {{field}}',
      cityRequired: 'נא לבחור עיר',
      loadFailed: 'לא הצלחנו לטעון את הטופס. בדקו את החיבור ונסו שוב.',
    },
  },
} as const;
