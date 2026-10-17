// FR-POST-014/022 — post ⋮ menu strings (split from post.ts for LOC cap).
export const postMenuHe = {
  menuA11y: 'תפריט פעולות',
  menuShare: 'שתף פוסט',
  menuHideFromFeed: 'הסתר מהפיד שלי',
  menuEdit: 'ערוך פוסט',
  menuSave: 'שמור',
  menuUnsave: 'הסר מהשמורים',
  menuDelete: 'מחק את הפוסט',
  menuAdminRemove: 'הסר כאדמין',
  saveSuccess: 'הפוסט נשמר.',
  saveError: 'השמירה נכשלה, נסה שוב.',
  unsaveSuccess: 'הוסר מהשמורים.',
  unsaveError: 'ההסרה נכשלה, נסה שוב.',
  deleteConfirmTitle: '🗑️ למחוק את הפוסט?',
  deleteConfirmBody:
    'הפוסט יימחק לצמיתות. שיחות שנפתחו סביבו יישארו ברשימת הצ\'אטים שלך, עם הערה שהפוסט המקורי לא זמין יותר.\n\nניתן למחוק פוסט פתוח, או פוסט סגור בלי שורת מקבל במערכת (למשל נסגר בלי סימון, או מקבל שנמחק מהמערכת). אם יש מקבל רשום — לא ניתן למחיקה מכאן; אפשר לפתוח מחדש לפי הצורך.',
  adminRemoveTitle: '🛡️ להסיר את הפוסט?',
  adminRemoveBody:
    'הפוסט "{{title}}" יוסתר מהפיד ויסומן כמוסר על ידי מנהל. ניתן יהיה לשחזר אותו בעתיד דרך יומן האודיט.',
  adminRemoveCta: 'הסר',
} as const;
