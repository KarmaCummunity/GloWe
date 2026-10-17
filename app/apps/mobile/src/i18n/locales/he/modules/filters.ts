// FR-FEED-004/005/006/018/020 — PostFilterSheet copy (header, section
// titles, sort/type/condition/status/source chips, location + radius).
// Extracted to a dedicated module per TD-156 incremental migration.
export const filtersHe = {
  header: 'סינון ומיון',
  clearAll: 'נקה הכל',
  apply: 'החל',
  searchPlaceholder: 'חיפוש בכותרת, תיאור או קטגוריה…',
  searchClearA11y: 'נקה חיפוש',

  // Section titles
  sectionType: 'סוג פוסט',
  sectionCategory: 'קטגוריה',
  sectionCondition: 'מצב המוצר',
  sectionStatus: 'סטטוס פוסט',
  sectionSource: 'מקור הפוסטים',
  sectionSort: 'מיון',
  sectionLocation: 'מיקום',

  all: 'הכל',

  // Type chips
  typeGive: '🎁 נתינה',
  typeRequest: '🔍 בקשה',

  // Item conditions
  conditionNew: 'חדש',
  conditionLikeNew: 'כמו חדש',
  conditionGood: 'טוב',
  conditionFair: 'סביר',
  conditionDamaged: 'שבור/תקול',

  // Status filter
  statusOpenOnly: 'רק פתוחים',
  statusClosedOnly: 'רק סגורים',

  // Source filter
  followersOnly: '👥 רק ממי שאני עוקב',

  // Sort
  sortNewest: '🆕 חדש קודם',
  sortOldest: '🕓 ישן קודם',
  sortDistance: '📍 לפי מיקום',
  sortPersonalized: '✨ מומלץ עבורך',
  sortDistanceCenterHint: 'מרכז המיון (ברירת מחדל: העיר שלך)',

  // Location
  allCities: 'כל הערים',
  radius: 'טווח',
  radiusKm: '{{km}} ק"מ',
} as const;
