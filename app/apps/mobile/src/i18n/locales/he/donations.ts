// Hebrew — Donations hub + Search tab (D-16, FR-DONATE-001..009, FR-FEED-016).
// Locale file under `locales/he/`; composed into the bundle via `locales/he/index.ts`.
// Rides strings (FR-RIDE-*) live in `donations.rides.ts` to keep file sizes
// under the architecture cap.

import { rides } from './donations.rides';

export const donations = {
  tabLabel: 'תרומות',
  hubTitle: 'תרומות של:',
  hubHeroTitle: 'תן. קבל. תרום מה שיש לך.',
  hubHeroSubtitle: 'בחר תחום שמדבר אליך והפוך אותו לפעולה.',
  hubItemsFeaturedTitle: 'חפצים',
  hubItemsFeaturedSubtitle: 'תרומה ובקשת חפצים — הפעולה המרכזית באפליקציה',
  hubCategoriesSectionTitle: 'תחומי תרומה נוספים',
  items: { title: 'חפצים', subtitle: 'תרומה ובקשת חפצים' },
  time: { title: 'זמן', subtitle: 'התנדבות וזמן פנוי' },
  money: { title: 'כסף', subtitle: 'תרומה כספית' },
  // FR-DONATE-006 — six new categories.
  categories: {
    food: {
      title: 'אוכל',
      subtitle: 'עמותות חלוקת מזון',
      body:
        'קטגוריית האוכל תיפתח בהמשך.\nועד אז מזמינים אתכם ללתרום לקהילה עצמה, ולעזור לנו לגדול ולהתפתח.\nבינתיים אפשר למצוא עמותות למזון, לחיסכון במזון ולחלוקה — בקישורים למטה.',
    },
    housing: {
      title: 'דיור',
      subtitle: 'דיור ושיכון',
      body:
        'קטגוריית הדיור תיפתח בהמשך.\nועד אז מזמינים אתכם ללתרום לקהילה עצמה, ולעזור לנו לגדול ולהתפתח.\nאם בא לכם לתמוך בארגוני דיור, שיקום ושיכון — עברו על הקישורים למטה.',
    },
    transport: {
      title: 'תחבורה',
      subtitle: 'הסעות וליווי',
      body:
        'קטגוריית התחבורה תיפתח בהמשך.\nועד אז מזמינים אתכם ללתרום לקהילה עצמה, ולעזור לנו לגדול ולהתפתח.\nלהסעות, ליווי וניידות לאנשים שזקוקים לזה — בחרו מהקישורים למטה.',
    },
    knowledge: {
      title: 'ידע',
      subtitle: 'שיעורים, חניכה והכשרה',
      body:
        'קטגוריית הידע תיפתח בהמשך.\nועד אז מזמינים אתכם לתרום מהמקצוע שלכם לקהילה, ולעזור לנו להתפתח.\nלשיעורים, חניכה והכשרה במקומות שמתאימים לכם — היכנסו לאחד הקישורים למטה.',
    },
    animals: {
      title: 'חיות',
      subtitle: 'הצלת חיות וטיפול בהן',
      body:
        'קטגוריית החיות תיפתח בהמשך.\nועד אז מזמינים אתכם ללתרום לקהילה עצמה, ולעזור לנו לגדול ולהתפתח.\nאם בא לכם לתמוך בהצלת בעלי חיים ובטיפול בהם — עברו על הקישורים למטה.',
    },
    medical: {
      title: 'רפואה',
      subtitle: 'תמיכה רפואית וציוד',
      body:
        'קטגוריית הרפואה תיפתח בהמשך.\nועד אז מזמינים אתכם ללתרום לקהילה עצמה, ולעזור לנו לגדול ולהתפתח.\nלעמותות של ציוד רפואי, טיפול ותמיכה, ותרומת דם ואברים — היכנסו לאחד הקישורים למטה.',
    },
  },
  moneyScreen: {
    title: 'תרומה כספית',
    body:
      'קטגוריית הכסף תפתח בהמשך. \nועד אז מזמינים אתכם ללתרום לקהילה עצמה, ולעזור לנו לגדול ולהתפתח.\nאבל אם בא לכם לתרום לעמותה קיימת ולקבל החזרי מס, תכנסו לאחד הקישורים פה למטה.',
    openLink: 'פתח את jgive.com',
    linkErrorTitle: 'לא הצלחנו לפתוח את הקישור',
    linkErrorBody: 'נסו דפדפן אחר או הקלידו את הכתובת ידנית.',
  },
  timeScreen: {
    title: 'תרומת זמן',
    body:
      'קטגוריית תרומת הזמן תפתח בקרוב.\nועד אז מזמינים אתכם להיכנס ולמצוא הזדמנויות התנדבות בפלטפורמה של ׳לב אחד׳, או בכל אחד מהקישורים פה למטה.',
    openLink: 'פתח את לב אחד',
    composerHeading: 'ניתן גם להתנדב ישירות בארגון שלנו, ולעזור לקהילה הזאת להפתח! \nהשאירו הודעה ונחזור אליכם.',
    composerPlaceholder: 'הקלידו את ההודעה שלכם — מקצוע, תחום עניין, וזמינות...',
    sendButton: 'שלח הודעה',
    sendError: 'לא נשלח. נסו שוב.',
    sendRetry: 'נסה שוב',
    volunteerPrefix: 'התנדבות בארגון: ',
  },
  // FR-DONATE-007/008/009 — community-curated NGO link list.
  links: {
    sectionTitle: 'עמותות וקישורים',
    addButtonA11y: 'הוספת קישור',
    empty: {
      title: 'עוד לא הוספו קישורים',
      body: 'הכי קל להתחיל — הוסיפו את הקישור הראשון.',
      cta: 'הוספת קישור ראשון',
    },
    loading: 'טוען...',
    loadError: 'לא הצלחנו לטעון את הקישורים. נסו שוב.',
    retry: 'נסה שוב',
    rowMenu: {
      open: 'פתח',
      report: 'דווח על קישור',
      edit: 'ערוך',
      remove: 'מחק',
    },
    reportSent: 'תודה, הדיווח התקבל.',
    confirmRemoveTitle: 'מחיקת קישור',
    confirmRemoveBody: 'הקישור יוסתר מהרשימה. להמשיך?',
    confirmRemoveOk: 'מחק',
    confirmRemoveCancel: 'ביטול',
  },
  // FR-DONATE-010 — platform-support CTA card embedded on About + Settings.
  supportUs: {
    title: 'תורמים באהבה? תרמו גם לקהילה',
    tagline:
      'קארמה היא קהילה חופשית שרצה על האהבה והנדיבות שלכם. כל תרומה עוזרת לנו להמשיך לבנות מקום של נתינה לכולם.',
    ctaBit: 'תרומה דרך ביט',
    ctaPaybox: 'תרומה דרך פייבוקס',
    ctaBitA11y: 'פתח את אפליקציית ביט לתרומה לקהילת קארמה',
    ctaPayboxA11y: 'פתח את אפליקציית פייבוקס לתרומה לקהילת קארמה',
    linkErrorTitle: 'לא הצלחנו לפתוח את הקישור',
    linkErrorBody: 'נסו לעדכן את האפליקציה או לפתוח את הקישור בדפדפן.',
  },
  // FR-RIDE-001..045 — hitchhiking (rides V3.0). Strings live in donations.rides.ts.
  rides,
  addLinkModal: {
    title: 'הוספת קישור חדש',
    editTitle: 'עריכת קישור',
    urlLabel: 'קישור (URL)',
    urlPlaceholder: 'https://...',
    nameLabel: 'שם תצוגה',
    namePlaceholder: 'שם העמותה / הקבוצה',
    descriptionLabel: 'תיאור (אופציונלי)',
    descriptionPlaceholder: 'מה אפשר למצוא בקישור הזה?',
    cancel: 'ביטול',
    submit: 'הוסף',
    save: 'שמור',
    submitting: 'מאמת קישור...',
    helperText: 'הקישור יבדק שיהיה תקין לפני ההוספה.',
    editHelperText: 'השינויים יבדקו מול השרת לפני השמירה.',
    errors: {
      invalid_url: 'הקישור לא תקין. ודאו שהוא מתחיל ב-http או https.',
      invalid_input: 'נא לוודא שכל השדות מולאו כראוי.',
      unreachable: 'הקישור לא נפתח. ייתכן שהוא לא פעיל.',
      rate_limited: 'הוספתם הרבה קישורים בזמן קצר. נסו שוב בעוד שעה.',
      unauthorized: 'יש להתחבר כדי להוסיף קישור.',
      forbidden: 'אין הרשאה לערוך את הקישור הזה.',
      network: 'בעיית רשת. נסו שוב.',
      unknown: 'שגיאה לא צפויה. נסו שוב.',
    },
  },
} as const;

export const search = {
  tabLabel: 'חיפוש',
  title: 'חיפוש',
  placeholder: 'חפש אנשים, פוסטים, קישורים...',

  // Category chips
  all: 'הכל',
  posts: 'פוסטים',
  people: 'אנשים',
  links: 'קישורים',
  orgs: 'ארגונים',
  hashtags: 'האשטגים',

  // Sort options
  sortBy: 'מיין לפי',
  sortRelevance: 'רלוונטיות',
  sortNewest: 'חדש ביותר',
  sortFollowers: 'עוקבים',

  // Filter
  filters: 'סינון',
  filterCity: 'עיר',
  filterPostType: 'סוג פוסט',
  filterCategory: 'קטגוריה',
  filterDonationCategory: 'קטגוריית תרומה',
  filterMinFollowers: 'מינימום עוקבים',
  filterRadius: 'רדיוס מהעיר',
  radiusKm: 'עד {km} ק"מ',
  clearFilters: 'נקה סינון',
  applyFilters: 'החל סינון',

  // Results sections
  sectionPeople: 'אנשים',
  sectionPosts: 'פוסטים',
  sectionLinks: 'קישורים',
  sectionOrgs: 'ארגונים',
  sectionHashtags: 'האשטגים',
  suggested: 'חיפושים מומלצים',
  showAll: 'הצג הכל',

  // Result info
  followers: '{{count}} עוקבים',
  givenItems: '{{count}} פריטים נתנו',
  inCategory: 'בקטגוריית {{category}}',

  // States
  noResults: 'לא נמצאו תוצאות',
  noResultsDesc: 'נסו מילות חיפוש אחרות או שנו את הסינון.',
  recentSearches: 'חיפושים אחרונים',
  clearRecent: 'נקה היסטוריה',
  startSearching: 'התחילו לחפש',
  startSearchingDesc: 'חפשו אנשים, פוסטים וקישורים בכל הקהילה.',
  minChars: 'הקלידו לפחות 2 תווים',
  loading: 'מחפש...',
  nationalLinks: 'מציג קישורים ארציים',
  give: 'נתינה',
  request: 'בקשה',
  giveBadge: '🎁 נתינה',
  requestBadge: '🔍 בקשה',

  // Post categories for filter
  categories: {
    Furniture: 'רהיטים',
    Clothing: 'בגדים',
    Books: 'ספרים',
    Toys: 'משחקים',
    BabyGear: 'ציוד תינוקות',
    Kitchen: 'מטבח',
    Sports: 'ספורט',
    Electronics: 'חשמל',
    Tools: 'כלי עבודה',
    Other: 'אחר',
  },


  // Donation categories for filter
  donationCategories: {
    time: 'זמן',
    money: 'כסף',
    food: 'אוכל',
    housing: 'דיור',
    transport: 'תחבורה',
    knowledge: 'ידע',
    animals: 'חיות',
    medical: 'רפואה',
  },

  marketplaceHubTitle: 'שוק התרומות',
  marketplaceHubSubtitle: 'כל עולמות הנתינה במקום אחד',
} as const;

export const marketplace = {
  browseTitle: 'שוק',
  searchPlaceholder: 'חיפוש מודעות…',
  allWorlds: 'כל העולמות',
  openMap: 'תצוגת מפה',
  createListing: 'פרסום מודעה',
  loading: 'טוען…',
  empty: 'אין מודעות לפי הסינון.',
  mapTitle: 'אשכולות במפה',
  mapEmpty: 'אין מודעות עם מיקום באזור.',
  clusterLabel: '{{count}} מודעות',
  notFound: 'המודעה לא נמצאה.',
  startChat: 'שליחת הודעה',
  shareFeed: 'שיתוף בפיד',
  chatOpener: 'היי — ראיתי את המודעה שלך בשוק.',
  createTitle: 'מודעה חדשה — {{world}}',
  fieldTitle: 'כותרת',
  fieldSummary: 'תקציר',
  publish: 'פרסום',
  publishing: 'מפרסם…',
  forYouTitle: 'בשבילך',
} as const;
