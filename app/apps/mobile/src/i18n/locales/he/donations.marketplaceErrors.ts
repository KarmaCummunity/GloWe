// Hebrew — marketplace create-listing rule and server error copy.
// Extracted from `donations.ts` (300-LOC cap). Composed into `marketplace.errors`.
// Keys mirror MARKETPLACE_SERVER_ERROR_CODES in @kc/domain (marketplaceWorldRules.ts).

export const marketplaceErrors = {
  food_expiry_required: 'יש להזין תאריך ושעת תפוגה עתידיים למזון.',
  routed_world_requires_external_body: 'יש לבחור ארגון מאומת לפני הפרסום בעולם זה.',
  medical_listing_requires_external_body: 'סוג מודעה זה ברפואה מחייב בחירת ארגון מאומת.',
  external_body_invalid: 'הארגון שנבחר אינו מאומת או אינו שייך לעולם זה. בחרו ארגון אחר.',
  world_permission_denied: 'הפרסום בעולם זה פתוח רק לחברים מאומתים. השלימו אימות חשבון ונסו שוב.',
  food_posting_banned: 'פרסום מזון חסום לחשבון שלך זמנית.',
  ride_cost_share_cap_exceeded: 'השתתפות בהוצאות הנסיעה גבוהה מהמותר.',
  money_active_campaign_cap: 'אפשר להחזיק עד 5 קמפיינים פעילים בעולם הכסף.',
  matchmaking_min_age: 'השתתפות בשידוכים מגיל 18 בלבד.',
  details_schema_mismatch: 'חלק מפרטי המודעה אינם תקינים. בדקו את השדות.',
  listing_details_schema_mismatch: 'חלק מפרטי המודעה אינם תקינים. בדקו את השדות.',
  media_path_must_be_owned: 'אחת התמונות לא הועלתה מהחשבון שלך. העלו אותה מחדש.',
  member_inactive: 'החשבון שלך אינו פעיל, ולכן אי אפשר לפרסם.',
  auth_required: 'יש להתחבר כדי לפרסם.',
  kind_not_found: 'סוג המודעה אינו זמין יותר. בחרו סוג אחר.',
  generic: 'הפרסום נכשל. נסו שוב.',
} as const;
