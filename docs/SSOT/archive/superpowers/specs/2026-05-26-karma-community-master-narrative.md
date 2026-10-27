# Karma Community (KC) — Master Narrative

> **Status:** v1.0.1 — Founder-approved master narrative (2026-05-26)
> **Purpose:** The single source of truth for who Karma Community is — past, present, vision, governance, money, voice, and brand. The About screen, marketing copy, FAQ answers, team bios, and any future external materials are sliced from this document; nothing important lives only in someone's head.
> **Audience for this doc:** Founder, PM, copywriters, implementers, future amuta board.
> **Related:** `docs/SSOT/spec/11_settings.md` (FR-SETTINGS About), `app/apps/mobile/src/i18n/locales/he/modules/aboutContent*.ts`, `app/apps/mobile/src/i18n/locales/he/donations.ts`, `docs/kc_log_evo/`

**How to read this document:**
- §1 — Document principles (the constitution: what we can/cannot say, and how)
- §2 — Identity stack (names, logo, brand visual)
- §3–§5 — Past · Present · Vision (the story arc)
- §6 — Roadmap
- §7 — Values, audience, how it works
- §8 — Contribution worlds (9 categories, 3 depth tiers)
- §9 — Team & contact
- §10 — Governance (3-stage constitution)
- §11 — Money (3 layers + permanent red lines)
- §12 — Internationalization
- §13 — FAQ
- §14 — About screen placement skeleton (detailed design in Part B)
- §15 — Tone and style
- §16 — Slogan bank (consolidated)
- §17 — Implementation notes
- §18 — Open items
- §19 — Legacy About inventory (historical reference)
- §20 — Changelog
- Appendix A — Full Hebrew copy bank (authoritative for `aboutContent*.ts`)

---

## 1. Document principles

### 1.1 Present vs. aspirational (מצוי / רצוי)

The About screen uses a synchronized **מה יש היום ↔ מה נבנה בהמשך** toggle on Problems, Features, and Goals (default: present on each screen visit; not persisted). Every claim in the document is tagged as Present, Aspirational, or Roadmap.

| Layer | Label (HE) | What may be stated |
|---|---|---|
| **Present** | מה יש היום | Shipped or actively in product: 9-category donations hub, items give/take with chat & closure, privacy modes, reports, basic stats, link portal, early community |
| **Aspirational** | מה נבנה בהמשך | Vision: in-app native flows for all 9 categories, money pass-through, org tools, international scale, "Facebook for philanthropy" at full scope |
| **Roadmap** | מפת דרכים | Phased path from present → aspirational; never imply a future phase is live |

Aspirational copy never uses present tense as fact ("we are the leading...") unless inside an explicitly labeled vision block.

### 1.2 Trust boundaries (what not to misrepresent)

- Today: **יוזמה לא רשומה.** Near future: registered Israeli amuta. Until then, copy uses **יוזמה / "the KC initiative,"** never "registered charity."
- Tech-giant opposition, global leadership, mass scale that does not exist yet — frame as **vision**, never as today's state.
- The 9 donation categories vary in depth: items has full app flow; time + money have bridges (Lev Echad, Jgive, Bit/PayBox); 6 others have curated NGO link lists. Be precise per category.
- No invented user/delivery metrics. Live stats only when wired (registered users, open posts, closed deliveries, team count); otherwise honest early-stage language.
- No absolute security/anonymity promises. Describe **controls** (privacy modes, reports, transparency commitments).

### 1.3 Reader journey (About screen arc)

1. **Hook (new visitor):** What is this, why trust it, why join — fast, warm.
2. **Depth (scroller):** Vision, problems, product, values, governance, money, roadmap, contribution worlds — Present/Vision toggle where applicable.
3. **Identity (engaged reader):** Names (Karma → KC), kibbutz kapitalist metaphor, logo symbolism, governance, brand identity.
4. **People & join (end):** Founder team card, initiative → future amuta, CTA: use the app → join team/volunteers/partners.

### 1.4 Progressive disclosure (show everything — comfortably)

The About screen contains the **full** story. Nothing important is omitted from the product surface — but density is layered:

| Pattern | Where used | Default | Expanded |
|---|---|---|---|
| **מה יש היום ↔ מה נבנה בהמשך** toggle | Problems, Features, Goals | Present copy | Aspirational copy |
| Single expand block | Vision | Short lead + purpose bullets | `visionExpandTitle` / Body |
| Per-phase expand | Roadmap | Phase summary | Phase details |
| FAQ accordion | FAQ | Question title | Full answer |
| **Per-team-member expand** | Team | 1–2 sentence teaser (`bio`) | Full personal story (`bioFull`) |
| Profile deep-link | Team | Explicit CTA | Navigates to `/user/{shareHandle}` |

### 1.5 Editorial doctrine — the constitution of this document

> **לא משקרים. כותבים מה יש היום, מה השאיפות, ואיך הולכים משם לשם. הדרך — גם היא חלק מהסיפור.**

Every paragraph in this document is judged against this line. A paragraph either describes truth-today, an honestly-labeled aspiration, or the path between — nothing else. No optimistic-but-vague claims. No defensive footnotes. **The path is the product, not a marketing problem.**

### 1.6 Core narrative arc

> **רחב כפלטפורמה. צעיר כקהילה.**

KC has built a wide civic infrastructure — 9 donation categories live, integrations with Jgive and Lev Echad, a curated NGO link system, a real items give/take product with chat and closure — before there is a mass community to fill it. This is **a choice, not an accident.** The vessel comes first. The community fills it.

This arc resolves the apparent contradiction between "we are at the start" (3 people, ~15 posts) and "the donations hub already has 9 categories." Both are true. They are the story.

**About-screen rule (UX):** Layer 1 — every new visitor sees **«מתחילים בקטן»** first (items, small team, growing community). Layer 2 — depth (9 categories, vision, governance, logo) for scrollers. Never open with infrastructure breadth alone.

---

## 2. Naming and identity stack

### 2.1 Name evolution (story order)

1. **Karma** — founder builds a real social network for social action, not a bulletin board.
2. **Karma Community** — community becomes the product; Hebrew: **קהילת קארמה**.
3. **KC** — short brand mark; also **קיבוץ קפיטליסטי** (Capitalist Kibbutz): a **voluntary** digital shared space inside a capitalist, technological, Western world — not anti-tech, **using** tech for good.
4. **Hebrew keyboard easter egg:** In Hebrew layout, `K`→`ל`, `C`→`ב` → **לב** (heart).

**Official entity (legal, today):** Initiative developing the platform (not yet a registered amuta). **Near-term plan:** Register as Israeli amuta. Until then, copy uses **יוזמה** / "the KC initiative."

### 2.2 Logo narrative (distribute across About — not Hero essay)

Visual elements to reveal progressively (e.g., Values + Mission + Vision expand):

| Element | Meaning |
|---|---|
| Left **K** | Letterform; also half of a heart |
| **C** | Completes heart with K; starts a circle |
| Right half | Mirror / reflection — self-reflection, accountability |
| Mirror completes | Half-heart → whole heart; C → full circle suggesting **globe** |
| Whole mark | Reads as **I ♥ the world** (love + world) |

**Copy note:** One short paragraph in Mission/Values is enough for first mention; a slightly longer "symbolism" block can live under Vision expand or Mission/Team — only for readers who scroll that far.

### 2.3 Logo evolution

Logos 0→5 express **almost the same story** — refinement of one idea, not six different brands. About copy should say that clearly so readers do not hunt for "hidden meanings" per version.

**Canonical current logo:** `logo-5.png` (in `docs/kc_log_evo/`). The active app asset `app/apps/mobile/assets/logo.png` should match — if it doesn't today, it will after the next design pass.

**Placement on About:** Vision expand block (or new `logoStoryExpand` keys) — not Hero.

**Assets:**

| File | Stage label (HE) | What changed visually |
|------|------------------|------------------------|
| `logo-0.jpeg` | רישום ראשון | קו ידני: K, חצי לב, לולאת c, מסגרת כמו מסך |
| `logo-1.jpeg` | צורה מתגבשת | לב + גלובוס; מעבר משחור-לבן לצבע ("מסך" כחול) |
| `logo-2.jpeg` | ביטוי כפול | פס אנכי + לב; שמאל פשוט, ימין צבעוני |
| `logo-3.jpeg` | קרבה למפה | לב + נקודת מיקום + עולם — קהילה **בשטח**, לא רק ברשת |
| `logo-4.png` | KC ברורים | k ו-c בצבעים נפרדים, לב שלם, גלובוס בבסיס |
| `logo-5.png` | **הלוגו של היום** | גרסה מלוטשת: לב, עולם, שיקוף — מוכן למוצר |

**Hebrew copy — `logoEvolutionTitle`:**

> איך הלוגו התפתח

**Hebrew copy — `logoEvolutionLead`:**

> הלוגו לא השתנה כל פעם סתם — הוא נהיה ברור יותר, אבל הסיפור נשאר אותו סיפור: **KC**, **לב**, **עולם**, ו**שיקוף**.

**Hebrew copy — `logoEvolutionBody`:**

> **מה הלוגו מספר (במילים פשוטות):**
> בצד שמאל — האות **K**, שגם נראית כמו חצי לב. לידה — **C**, שמשלימה את הלב ואת העיגול. בצד ימין — **שיקוף**: כמו מבט במראה, התבוננות — מה שיוצא מהלב חוזר אלינו. יחד זה גם נראה כמו **אהבה לעולם** — לב סביב כדור הארץ.
> במקלדת עברית, **KC** הופכים ל-**לב** (כי K→ל ו-C→ב) — זה לא שיווק, זה חלק מהשפה שלנו.
>
> **התפתחות קצרה:**
> - **התחלה** — רישום על הנייר: רעיון של קהילה דיגיטלית עם לב ומסך.
> - **פיתוח** — אותו רעיון, יותר צבע ויותר "עולם".
> - **שיפור** — הדגש על מקום: עזרה **ליד הבית**, לא רק באינטרנט.
> - **עכשיו** — לוגו אחד ברור לקהילת קארמה: פשוט מספיק לזכור, עמוק מספיק לשאת את החזון.
>
> אנחנו מתקדמים **יחד עם הקהילה** — כל פידבק משפיע על המוצר; הלוגו כבר מספר את מה שלא משתנה: נתינה, קשר, ועולם אחד קטן שמתחבר לשכנה.

**First mention (one sentence — Values or Mission, not Hero):**

> בלוגו שלנו מסתתרים K ו-C, לב, שיקוף ועולם — אותו מסר בכל הגרסאות.

### 2.4 Brand identity (visual) — locked in v1.0

**Name:** קהילת קארמה — KC
**Domain:** [karma-community-kc.com](https://karma-community-kc.com)
**App name:** "KC - קהילת קארמה" (long) · "KC" (short)
**Bundle:** `com.karmacommunity.app`

**Colors** (codified in [`app/packages/ui/src/theme/colors.ts`](app/packages/ui/src/theme/colors.ts)):

- **ראשי — כתום חם (`#F97316`).** סמל לנדיבות, חום, יוזמה.
- **משני — אינדיגו רגוע.** תחושה קהילתית-חברתית.

**Typography:** System fonts on each platform (San Francisco on iOS, Roboto on Android). **Brand font is intentionally left open** — to be selected when a designer is engaged. Heebo and Assistant are strong candidates for Hebrew-first RTL when that decision is made.

**Visual mark:** Logo as described in §2.2–2.3. Canonical file: `logo-5.png`.

---

## 3. Past — founder and origin

### 3.1 Founder personal arc — locked `bioFull`

**Founder:** Nave Sarussi (נוה סרוסי).

The locked Hebrew `bioFull` (used in `teamRoles.founder.bioFull`):

> בעולם הפילנתרופיה לא חסר כסף. חסרים ידע, שקיפות, טכנולוגיה ויעילות.
>
> את התובנה הזו נשאתי שנים בלי שידעתי שזה הפרויקט שלי. גדלתי במשפחה דתית-ציונית. עוד בתיכון, בזכות סביבה שדחפה להצטיין, סיימתי תואר במדעי המחשב; במקביל התחלתי לשאול שאלות אמיתיות על מי אני. **חזרתי בשאלה.**
>
> אחרי מכינה מעורבת — פילוסופיה, מפגש עם שכבות החברה הישראלית — התגייסתי ל**יחידת אופק 324, תת-יחידה מא"ב** — יחידה טכנולוגית בחיל האוויר, פיתוח קוד למטוסי קרב. בכל החיים שלי עד אז הייתי מוקף באנשים שרצו להצטיין. בצבא ראיתי את הניגוד: הרבה חכמים, מעטים מצוינים, פרויקטים איטיים, יחס אישי לא תמיד מכבד. הניגוד הזה לימד אותי משהו על קהילה: לקהילה עם חזון ברור וכלים חזקים יש כוח אדיר.
>
> את אותה תובנה רציתי להחיל על עולם הנתינה — שעבד עליי שנים, אבל בלי כלים, בלי טכנולוגיה, בלי שקיפות. התחלתי בקטן ("לחבר גמ"חים לרשתות חברתיות"), עברתי לרשת חברתית לעשייה טובה, והגעתי לחזון של **פייסבוק לפילנתרופיה** — מקום אחד שמרכז כל סוג של עשייה טובה: חפצים, זמן, כסף, ידע — בעולם כולו.
>
> היום אנחנו בצעד הראשון: אפליקציה למסירת חפצים בחינם, בעברית, בישראל. עוד מעט אנשים, עוד הרבה דרך. זה בדיוק המקום שבו דברים אמיתיים מתחילים.

**Editorial rule for personal stories:** Personal stories carry no dates. Only project milestones (app launch, amuta registration, etc.) get dated. This keeps `bioFull` evergreen.

### 3.2 Product idea lineage (timeline labels)

| Era | Description | Doc tag |
|-----|-------------|---------|
| Seed | Connect gemachim + social graphs | Past |
| Focus | Social network for philanthropy / social good | Past → Present bridge |
| MVP | Items give/take + 9-category donations hub (bridges + curated links) | **Present** |
| Platform | In-app native flows for all 9 categories, org management, campaigns | **Aspirational** |
| North star | Global hub for documented social good | **Aspirational** |

---

## 4. Present — what exists today (מצוי)

### 4.1 Product (factual)

- **Stage:** First product launch — social app for free item give/take + **9-category donations hub** with bridges and curated NGO links (Israel, Hebrew RTL).
- **Core loop (items):** Post give/request → in-app chat → coordinate handoff → mark delivery closed.
- **Donations hub:** 9 categories at varying depth (see §8).
- **Team:** Founder + 2-3 volunteers helping on small tasks.
- **Community:** Early — bare-handful active users, ~15 posts most of which the founder posted to demonstrate the product. Growing intentionally slowly while the platform stabilizes.
- **Monetization between users:** **None — ever.** No commerce, no fees, no ads in app (see §11 Money).
- **Code:** Always was and always will be public on GitHub. Open source is a permanent commitment, not a phase.

### 4.2 Present — problems we solve (Hebrew bullets for `problemsItemsMvp`)

1. **עזרה מפוזרת וכפולה** — קבוצות וואטסאפ, עמותות ואתרים — כל אחד לבד. קשה לדעת על מי לסמוך ואיפה באמת צריך.
2. **בושה לבקש עזרה** — הרבה אנשים נשארים עם הצורך לבד — "לא מגיע לי" או "זה מביך".
3. **פער בין נותן למקבל** — מי שיש לו לא תמיד יודע למי זה משנה; מי שצריך לא תמיד יודע איפה לחפש.
4. **פלטפורמות שלא בנויות לקהילה** — פרסומות, רעש, או חוסר טכנולוגיה — ופחות דאגה לאנשים.

### 4.3 Present — what's in the app (Hebrew, aligned to shipped features)

- **חפצים** — פרסום מסירות ובקשות (פוסטים, מיקום, מסננים), צ׳אט פנימי לתיאום (בלי לחשוף טלפון), סגירת מסירה.
- **9 דרכי תרומה** בלשונית "תרומות": חפצים (פעיל מלא), זמן (חיבור ללב אחד + ערוץ ישיר), כסף (Jgive + ביט/פייבוקס), אוכל / דיור / תחבורה / ידע / חיות / רפואה (קישורים אוצרים).
- **פרטיות בשליטה** — פרופיל ציבורי/פרטי, בקשות מעקב, אנונימיות כבחירה.
- **דיווחים וכללי קהילה** — חוקים שקופים, דיווח על תוכן או משתמש.
- **סטטיסטיקות אישיות וקהילתיות** — מתעדכנות אוטומטית.

### 4.4 Present — goals (Hebrew)

- מסירה ובקשה שגרתיים ובטוחים יותר
- פחות בזבוז חפצים
- אמון דרך מוצר שקוף — לא רק סלוגנים
- פתיחת תשתית רחבה לפני קהילה מסיבית

### 4.5 Legal/status copy (Hebrew — use verbatim intent)

> קהילת קארמה (KC) היא **יוזמה** שמפתחת את האפליקציה ומטפחת קהילה. **היזם ממן את התפעול בעצמו.** תרומות שהתקבלו עד עכשיו — מחוץ לאפליקציה, באופן אופציונלי — **יושבות בקופה** ולא נוגעים בהן עד שנירשם כעמותה. אז ייפתחו גם ערוצי תרומה רשמיים בתוך האפליקציה — בהסכמה, בשקיפות, ולעולם לא חובה.

### 4.6 Operational truth — «מתחילים בקטן» (radical honesty, positive frame)

**Headline for About / Numbers (Hebrew):**

> **מתחילים בקטן. בונים קהילה אמיתית — לא מספרים גדולים.**

The document captures the actual operational state, deliberately and openly:

- **צוות ליבה קטן** — היזם + 2–3 מתנדבים. זה מאפשר לזוז מהר ולשמוע מהשטח.
- **קהילה עדיין בצעדים הראשונים** — מעט משתמשים פעילים; הפוסטים הראשונים מציגים איך המוצר עובד. **זה בכוונה** — לא ממהרים לגייס המונים לפני שהבסיס יציב.
- **אפס שותפויות פעילות** עם ארגונים כרגע — החזון רחב; השלב הזה מתמקד באנשים פרטיים (ראה §7.2).
- **קוד פתוח 100%** מהיום הראשון.
- **DNA בינלאומי, התמקדות זמנית בישראל** (ראה §12).

**Do not lead with** «רוב הפוסטים של היזם» as a headline — use only in FAQ or founder `bioFull` if needed. Public copy stays: **מתחילים בקטן + מזמינים להצטרף מוקדם.**

This honesty IS the brand. It is not a weakness to manage; it is the trust signal that distinguishes KC from glossy NGO marketing.

---

## 5. Aspirational — vision (רצוי)

### 5.1 One-line north star — candidates for Hero (see §16 Slogan bank for full bank)

- **Brand essence:** לתת — זה גם לקבל.
- **Mechanism:** כסף לא עובר בין אנשים. נקודה.
- **Metaphor:** קיבוץ דיגיטלי — שיתוף מרצון בעולם טכנולוגי — שמחבר כל מי שרוצה לתת עם מי שצריך.
- **Platform:** רשת חברתית שמרכזת עשייה טובה — חפצים, זמן, כסף, ידע — בלי מסחר בין אנשים.
- **Bold:** לבנות את שכבת הפילנתרופיה החסרה: ידע, שקיפות, טכנולוגיה, יעילות — לא רק עוד קמפיין.

### 5.2 "Facebook for philanthropy" (Hebrew — vision-context only)

> בטווח הארוך אנחנו שואפים להיות **המרכז החברתי לעשייה טובה** — מקום אחד שבו עמותות, מתנדבים ואנשים פרטיים מפרסמים, מגלים ומתאמים עזרה, עם שקיפות וכלים מקצועיים. היום אנחנו מתחילים מחפצים, ובהמשך נפתח את כל 9 הקטגוריות לפעולה ישירה — בזהירות, לפי אמון ובטיחות.

Do **not** claim tech giants block KC unless factual and documented.

### 5.3 Vision — problems (`problemsItemsVision`)

- מקום אחד לעשייה טובה — לרכז נתינה, התנדבות וקשר לעמותות — בלי כפילויות ובלי אינטרס מסחרי.
- קהילה בלי כפייה — ביחד וחופש יחד: שיתוף מרצון, בלי "חובה להצטרף" לכל דבר.
- פחות בזבוז, יותר שימוש חוזר — חפצים, מזון בסיס וידע זזים בין אנשים.
- בטיחות ושקיפות שגדלות — כלים קהילתיים ופיקוח ברור — בלי למכור את המשתמשים.
- הרחבת סוגי העזרה — זמן, מומחיות, קמפיינים — רק כשההגנות מוכנות.

### 5.4 Vision — features & goals

Reuse the existing structure in `aboutContentUxRefreshPartA.ts` but tighten prose in copy pass; add org dashboards, campaign tools, international community only under Vision toggle or roadmap phases.

### 5.5 Five-year aspirational picture

With a small core team, become a leading global social network for good; international community optimizes donations and volunteering; all nonprofits with professional transparency; every form of social good can be published and tracked through KC.

**Copy guardrail:** Frame as **direction**, not reporting.

---

## 6. Roadmap — the path (מצוי → רצוי)

| Phase | Label | Truth | Story |
|---|---|---|---|
| א׳ | ליבה יציבה | **Now** | Identity, posts, chat, privacy, reports, basic stats, 9-category hub with bridges + links |
| ב׳ | עומק קהילתי | Soon | Native flows for time/money/knowledge in-app, moderation transparency, onboarding, bridges to orgs/neighborhoods |
| ג׳ | השפעה רחבה | Future | Partnerships, events, education, community leaders, native flows for remaining categories |
| ד׳ | מעבר לחפצים | Long-term | International rollout, all 9 categories native, KC as own pass-through channel for donations to other NGOs |

**Roadmap copy must repeat:** Phase א׳ is current; ב׳–ד׳ are planned.

---

## 7. Values, audience, how it works

### 7.1 Core values (Hebrew chips)

שקיפות · אחדות · קהילה · התחדשות · אמינות · אנונימיות כבחירה

**Transparency vs. privacy (product truth):** Default product transparency; user-controlled privacy where appropriate.

### 7.1b Quotes and guiding principles

**Key phrase (brand line — use once prominently):**

> **לתת — זה גם לקבל.**

**Verbatim quotes (Hebrew quotation marks in UI):**

| # | Quote | Suggested use |
|---|---|---|
| 1 | «לתת זה גם לקבל» | Vision pull-quote |
| 2 | «לכל אחד יש משהו שהוא צריך, ומשהו שהוא שמח לתת» | Vision pull-quote |
| 3 | «השאריות של האחד יכול להיות האוצר של מישהו אחר» | Values or Vision expand |

**Adapted principles (`valuesText`):**

- נתינה היא לשני הצדדים — מי שנותן גם מקבל ערך.
- לכל אחד יש מה לתרום ומה לבקש — אין "רק נותנים" או "רק מקבלים".
- מה שמישהו לא צריך יכול לשנות את היום של מישהו אחר.

### 7.2 Audience (Hebrew — `audienceText`)

> **למי זה מתאים?** לכל מי שרוצה לתת או לקבל — בלי הבדלים ובלי שיפוט.
> משפחות שמצמצמות חפצים, סטודנטים שעוברים דירה, עולים שמתחילים מחדש, קשישים שצריכים עזרה, שכנים וקהילות מקומיות — וכל מי שמעדיף לתת ולקבל דרך אנשים, לא דרך זירת מכירות.
> **בשלב הראשון** אנחנו מתמקדים באנשים פרטיים. **בהמשך** נחבר גם עמותות וארגונים — רק אחרי שתהיה קהילה חזקה של אנשים, ובקצב שמכבד בטיחות.

Optional Vision-only paragraph:

> עמותות וארגונים מוזמנים לעקוב ולהכיר — הכלים הארגוניים ייבנו כשהבסיס הקהילתי יהיה מוכן.

### 7.3 How it works (Hebrew)

**מה יש היום (3 steps — `howItWorksText`):**

1. **מפרסמים** — כותבים מה יש לתת או מה מחפשים, עם תמונה ואזור.
2. **מתאמים** — מדברים בצ׳אט בתוך האפליקציה, קובעים מקום ושעה. אין חובה לתת טלפון.
3. **סוגרים** — מסמנים שהמסירה בוצעה. בלי כסף, בלי עמלה, בלי מתווך.

**מה נבנה בהמשך (5 steps — `howItWorksVisionText`):**

1. הצטרפות מהירה — רק מה שצריך.
2. פרסום או חיפוש — בקשה או הצעה ברורה.
3. **מפה** — לראות מה קורה ליד הבית (עדיין לא זמין).
4. קשר ישיר — צ׳אט ותיאום.
5. מסירה וסגירה — קשר אנושי + חיזוק הקהילה.

Footer line (both):

> הכל בחינם, הכל שקוף, הכל בין אנשים — בלי בירוקרטיה ובלי עמלות.

### 7.4 Voice unity

> **קול אחד. מסרים אחידים וברורים. בכל ערוץ אנחנו נשמעים כמו עצמנו.**

The master document defines KC's voice. Every channel (app, Instagram, WhatsApp, email, partnerships) speaks in that voice. Channel-specific tactics (lengths, formats, visual treatment) are execution decisions, not voice decisions — out of scope for this doc.

---

## 8. Contribution worlds — 9 categories, 3 depth tiers

KC's donations hub is built around 9 categories. **Every category is live in the app today** — they vary only in how deep the in-app integration is.

### 8.1 Tier 1: Full in-app product

| Category | Status | What's there |
|---|---|---|
| **חפצים וציוד** | ✅ Full app | Post/request/chat/closure flow with photos, location, filters |

### 8.2 Tier 2: Bridges (external integration + KC channel)

| Category | Status | What's there |
|---|---|---|
| **זמן והתנדבות** | 🔗 Bridge | Lev Echad integration + direct volunteer-to-KC channel |
| **כסף** | 🔗 Bridge | Jgive.com for donations to other NGOs + Bit/PayBox for direct support of KC project |

### 8.3 Tier 3: Curated portal (external links, community-maintained)

| Category | Status | What's there |
|---|---|---|
| **אוכל** | 📋 Curated links | NGO links for food rescue and distribution |
| **דיור** | 📋 Curated links | NGO links for housing aid |
| **תחבורה** | 📋 Curated links | NGO links for transport and accompaniment |
| **ידע** | 📋 Curated links | NGO links for tutoring, mentorship, training |
| **חיות** | 📋 Curated links | NGO links for animal rescue and care |
| **רפואה** | 📋 Curated links | NGO links for medical aid, equipment, donations |

**Community-curated:** Users can submit links (FR-DONATE-007/008/009) and report inappropriate ones.

### 8.4 Editorial position on the 9 categories

> **יש המון דרכים לתת. אנחנו לא נגביל אתכם רק למה שבנינו.**
> הלשונית "תרומות" מרכזת קישורים לכל סוג נתינה אפשרי — גם למה שעוד לא מצאנו זמן לבנות. KC הוא ה**מרכז** של עשייה טובה, לא רק האפליקציה שלנו.

The portal IS the principle: anti-territorial, pro-community. "We haven't built X yet" becomes "we believe KC is a hub, not a walled garden."

---

## 9. Team, CTAs, contact

### 9.1 Mission intro (Hebrew — `missionTeamIntro`)

> קהילת קארמה (KC) היא רשת חברתית לעשייה טובה — מתחילים ממסירת חפצים בחינם, בלי מסחר בין אנשים. היום אנחנו יוזמה שבונה את המוצר עם קהילה מוקדמת; בקרוב נירשם כעמותה בישראל. הקוד שלנו פתוח, הצוות שלנו קטן, והדרך — חלק מהסיפור.

### 9.2 Founder team card (`teamRoles.founder`)

**`role`:** מייסד הפרויקט

**`bio` (teaser, always visible — 2 sentences):**

> נוה, מייסד קארמה. בניתי את הפרויקט הזה אחרי שהבנתי שבעולם הנתינה לא חסר כסף — חסרים ידע, שקיפות וטכנולוגיה.

**`bioFull` (expand):** see §3.1 — locked text.

**`profileLinkLabel`:** לפרופיל בקהילה

**Expand controls:**

- `teamStoryExpandMore`: "הסיפור המלא"
- `teamStoryExpandLess`: "פחות"

### 9.3 Dual CTA (order)

1. **User:** "הצטרפו כמשתמשים" — start giving/receiving (link to auth / feed).
2. **Team:** "רוצים להצטרף למסע?" — partners, volunteers, advisors (product, community, accessibility, safety) — contact channels.

### 9.4 Initiative vs. amuta (team section)

> KC מפותחת כיום על ידי **יוזמה** שתירשם בקרוב כעמותה בישראל. מחפשים מתנדבים ושותפים לבנות את התשתית יחד עם הקהילה.

---

## 10. Governance — the constitution

KC's governance is designed in three stages, deliberately. Each stage answers a different question.

### 10.1 Today — founder decides

The founder is the sole decision-maker, supported by 2-3 volunteers. The structure is intentionally minimal so that early product decisions can be made fast. The risk of "founder-only" is balanced by the future commitment to iron-clad bylaws (§10.2).

### 10.2 Amuta stage — iron-clad bylaws + standard board

When KC registers as an Israeli amuta, two things happen in parallel:

1. **Standard non-profit governance:** Board of directors (ועד מנהל), executive director (מנכ"ל), audit committee (ועדת ביקורת) per Israeli amuta law.
2. **Iron-clad bylaws (תקנון ברזל):** A set of values, principles, and red lines that **cannot be changed** — not by future leadership, not by a board majority, not by anyone. The bylaws lock in:
   - Zero money between users
   - Zero ads
   - Zero fees from users
   - 100% open-source code, forever
   - Voluntary participation (no forced community membership)
   - Transparency commitments

The iron bylaws are the answer to "what if the founder leaves?" They are the structural guarantee that the values predate any specific leadership.

### 10.3 Long-term — democratic voting layer

Over time, KC will add a democratic voting mechanism on top of the iron bylaws. **The bylaws are the frame; the community decides the path inside the frame.** Users will be able to vote on product directions, partnerships, governance refinements (within bylaws), and major decisions.

This combination — locked values + open voice — is the structural expression of **קיבוץ קפיטליסטי**: a fixed shared frame that protects values, with voluntary participation that shapes the path.

### 10.4 Editorial framing for governance (Hebrew)

> **המסגרת קבועה. הקהילה מחליטה את הדרך.**

See §16 Slogan bank for alternative formulations.

---

## 11. Money — 3 layers + permanent rules

KC's relationship with money is one of the strongest differentiators. The model is layered by time.

### 11.1 Today (Layer 1)

- **Zero money flows through the app between users.** Items give/take is and always will be free.
- **Project support today:** Optional, out-of-app. Users who want to support KC itself can use Bit or PayBox (links shown in app via `DonationSupportCard` and `donations.supportUs`, but money flows outside the app).
- **Donations sit in escrow.** Any money received is **not touched** — it sits in a designated account, waiting for KC to be a registered amuta. This is a public commitment, not a fundraising trick.
- **External NGO donations today:** Jgive.com integration in the money category for donations to other Israeli non-profits.

### 11.2 Near future (Layer 2) — after amuta registration

- **In-app donation flow for KC itself:** Once amuta status is granted, KC opens an in-app channel to receive donations directly. With explicit consent. With transparency reports. **Always optional, never required.**
- Paid campaigns and donor partnerships become possible (donors, not investors).
- Escrowed funds become accessible per amuta financial rules.

### 11.3 Long term (Layer 3)

- **KC as a pass-through channel for other NGOs:** Instead of linking out to Jgive, KC builds its own infrastructure to receive and route donations to other NGOs. Same principles as own donations: consent, transparency, optional.

### 11.4 Permanent red lines (Layer 0 — never changes)

Locked in the iron-clad bylaws (§10.2):

- **Zero commerce between users.** No fees for posting, no commission on items, no "premium" features.
- **Zero ads.** No advertising of any kind in the app.
- **Always optional.** No user is ever required to donate. No feature is gated by donation.
- **Open-source code, always.**

### 11.5 Editorial framing for money (Hebrew)

> **כסף לא עובר בין אנשים. נקודה.**

This is the headline. The 3 layers describe how project funding evolves; the headline says what never changes — money does not move between users. Ever.

---

## 12. Internationalization

### 12.1 Languages

> **עברית היום. כל השפות בהמשך.**

KC's DNA is international; its first community is Israeli. The app launches in Hebrew. As the product stabilizes, languages are added — Arabic, English, Russian, French, and any other language with a real community.

### 12.2 Cultural translation, not just word translation

Translation in KC is not a marketing afterthought. Each language version requires:

- Adapted gendered language patterns
- Local norms for giving/receiving (privacy expectations differ)
- Local NGO link curation per category
- Local crisis/holiday context (e.g., יום הזיכרון, רמדאן)

**The values translate; the words follow.**

---

## 13. FAQ — full list (12 items)

Full Hebrew strings live in Appendix A § A.10. Summary table:

| # | `q` (HE) | `a` (summary) |
|---|---|---|
| 1 | האם השימוש עולה כסף? האם יש פרסומות? | לא. בלי מסחר בין אנשים, בלי עמלות, בלי פרסומות. |
| 2 | איך מתחילים? | הורדה, הרשמה קצרה, פרסום או חיפוש באזור. |
| 3 | מה יש היום — ומה עדיין בדרך? | היום: חפצים מלא + 9 קטגוריות בלשונית תרומות. בהמשך: זרמים פנימיים לכל הקטגוריות, ערוץ תרומה בתוך האפליקציה, כלים לעמותות. |
| 4 | מה זה «קיבוץ דיגיטלי»? | קהילה מרצון בעולם טכנולוגי — בלי כפייה ובלי עמלות. |
| 5 | מה ההבדל בינינו לקבוצות וואטסאפ או ליד2? | מקום אחד שקוף — לא זירת מכירות, לא פרסומות. |
| 6 | איך שומרים על בטיחות ופרטיות? | מצבי פרטיות, דיווחים, כללים. בלי הבטחות מוגזמות. |
| 7 | האם אפשר לתרום כסף דרך האפליקציה? | היום: ביט/פייבוקס מחוץ לאפליקציה, יושב בקופה עד עמותה. אחרי רישום: ערוץ פנימי, אופציונלי. תרומה לעמותות אחרות — דרך Jgive בלשונית כסף. |
| 8 | איפה אפשר להשתמש? | אפליקציה ואתר בפיתוח מתמשך. |
| 9 | האם הקוד פתוח? | כן. תמיד היה ותמיד יישאר ציבורי. |
| 10 | איך אפשר לעזור לפרויקט? | להשתמש, לשתף, להוסיף קישורים, להתנדב. |
| 11 | איך משפיעים על מפת הדרכים? | דיווח באפליקציה/מייל/רשתות. בעתיד הרחוק — מנגנון הצבעה. |
| 12 | למה «קארמה» ומה זה KC? | מעגליות; KC = קהילת קארמה = קיבוץ קפיטליסטי; במקלדת עברית גם «לב». |

---

## 14. About screen — content placement map (skeleton)

> **Detail of the layered presentation — sections, toggles, accordions, expands, mobile-first treatment — is covered in Part B (separate design spec to be written after v1.0 approval).**

Skeleton mapping (this doc → screen section):

| Section ID | Reader stage | Content from this doc |
|---|---|---|
| Hero | New visitor | §5.1 + §16 Slogan bank picks |
| Numbers | Trust | Live counts (users, posts, deliveries, team) + permanent principles (§4.6 + §11.4) |
| Vision | Depth | §5 + toggle; expand for KPI prose |
| Problems | Depth | §4.2 / §5.3 |
| Features | Depth | §4.3 / §5.4 |
| Mission | Identity | §9.1 + §2.2 logo + §9.4 initiative |
| Team | Join / deep read | §9.2 (bio + bioFull + profile link) |
| How | New visitor | §7.3 |
| Audience | New visitor | §7.2 |
| Values | Identity | §7.1 + §7.1b |
| **Governance** | Trust | §10 (new) |
| **Money** | Trust | §11 (new) |
| Roadmap | Path | §6 |
| Goals | Depth | §4.4 / §5.4 toggle |
| Contributions | Present/Vision | §8 (9 categories, 3 tiers) |
| FAQ | All | §13 + Appendix A.10 |
| Contact | Join | Existing channels + initiative wording |

**Heavy logo detail:** Mission + Values + Vision expand — not Hero first paragraph.

---

## 15. Tone and style (Hebrew copy rules)

- **Register:** UX / dugri-friendly Israeli — short sentences, imperative where natural, no bureaucratic Hebrew.
- **Gender:** Neutral rewording where possible ("יש ללחוץ", "אפשר לבחור").
- **Spelling:** Ktiv maleh (e.g. תוכנה, שירות).
- **Metaphor:** "קיבוץ קפיטליסטי" is brand core — explain in one breath: voluntary shared digital space inside capitalist/tech world.
- **Honesty:** Early stage is a feature ("בונים יחד"), not hidden.
- **Voice unity (§7.4):** One voice across all channels.
- **Reading test:** "יהודי בן 60 מהפריפריה יבין בקריאה ראשונה."

**Forbidden / replace on About screen:**

| Avoid | Use instead |
|---|---|
| MVP | "מה יש היום" / "הגרסה הראשונה" / "מה שכבר עובד" |
| Vision (English label) | "מה אנחנו בונים בהמשך" / "הכיוון שלנו" |
| PMF, KPI, North Star, toggle, feed (unexplained) | עברית פשוטה |
| Philanthropy, infrastructure, scale | תרגום או ניסוח יומיומי |
| Unexplained acronyms | "קהילת קארמה (KC)" first time, then KC |

**Allowed when Israelis expect them (spell in Hebrew or add 3-word context):**

- ווטסאפ, ביט, פייבוקס, גיטהאב (with "קוד פתוח" context), אינסטגרם
- צ׳אט, פוסט, פיד — only if plain ("רשימת בקשות והצעות באזור שלכם" may replace "פיד")

**Toggle hint (Hebrew):**

> המעבר בין "מה יש היום" ל"מה נבנה בהמשך" משנה רק את הסיפור כאן — לא את האפליקציה בטלפון.

---

## 16. Slogan bank (consolidated source of truth)

All brand slogans, taglines, and key phrases live here. The About screen and any external materials draw from this bank. **Visual presentation is decided in Part B; the wording is locked here.**

### 16.1 Brand essence

- **לתת — זה גם לקבל.** *(the key brand line)*
- **כסף לא עובר בין אנשים. נקודה.**
- **קיבוץ דיגיטלי בעולם טכנולוגי.**

### 16.2 Mechanism

- **בחינם. בלי פרסומות. בלי מתווכים.**
- **0 עמלות. 0 פרסומות. 0 מסחר בין משתמשים.**
- **הכל בחינם, הכל שקוף, הכל בין אנשים — בלי בירוקרטיה ובלי עמלות.**

### 16.3 Philosophy

- **לכל אחד יש משהו שהוא צריך, ומשהו שהוא שמח לתת.**
- **השאריות של האחד יכול להיות האוצר של מישהו אחר.**
- **נתינה היא לשני הצדדים.**

### 16.4 Identity

- **קהילת קארמה — KC.**
- **במקלדת עברית KC = לב.**
- **K, C, לב, גלובוס, שיקוף — אותו סיפור בכל גרסה של הלוגו.**

### 16.5 Vision

- **פייסבוק לפילנתרופיה.** *(used carefully, vision-context only)*
- **המקום שבו הטוב קורה.**
- **המרכז של עשייה טובה.**

### 16.6 Trust

- **תרומות יושבות בקופה עד רישום עמותה.**
- **קוד פתוח 100%, תמיד.**
- **לא משקרים. מתארים את הדרך.**

### 16.7 Path (the honest-stage line)

- **רחב כפלטפורמה. צעיר כקהילה.**
- **עוד מעט אנשים, עוד הרבה דרך.**
- **זה בדיוק המקום שבו דברים אמיתיים מתחילים.**

### 16.8 Governance

- **תקנון ברזל. הצבעה חופשית.**
- **הערכים נעולים. הקול שלך פתוח.**
- **המסגרת קבועה. הקהילה מחליטה את הדרך.**

### 16.9 Audience / universality

- **למי זה מתאים? לכל מי שרוצה לתת או לקבל — בלי הבדלים ובלי שיפוט.**
- **מה שיוצא לקהילה — חוזר כטוב.**

### 16.10 Editorial doctrine (the document's own headline)

- **לא משקרים. כותבים מה יש היום, מה השאיפות, ואיך הולכים משם לשם. הדרך — גם היא חלק מהסיפור.**

---

## 17. Implementation notes (team expand)

`AboutMissionTeamSection` already navigates to `/user/{shareHandle}` on card press. To meet the founder requirements, a small FE change is needed:

- Add per-card expand state (same UX as `AboutRoadmapTimeline`)
- Split locale `TeamRoleCopy` into `bio` + `bioFull`
- Add visible `profileLinkLabel` row (navigate on press; stop propagation from expand toggle)

Copy/locale work can proceed in parallel once UI contract is agreed.

---

## 18. Open items (post-v1.0)

Almost all open items from v0.8 are resolved in v1.0. What remains:

- [ ] **Live numbers wiring** on About — confirm which existing counters (registered users, open posts, closed deliveries, team count) are surfaced. Implementation question, not narrative.
- [ ] **Amuta registration timeline** — update §4.5 and §10.2 with actual date once the certificate exists.
- [ ] **Logo asset audit** — verify `app/apps/mobile/assets/logo.png` matches `docs/kc_log_evo/logo-5.png`; if not, replace.
- [ ] **Brand font** — left intentionally open per §2.4; revisit when a designer joins.

---

## 19. Legacy About / marketing site inventory (historical reference)

Sources reviewed in v0.3–v0.8 (kept for context):

- [dev About app shell](https://dev.karma-community-kc.com/about-site/app?hideTopBar=false&hideBottomBar=false) — full Hebrew marketing copy.
- [karma-community-kc.com/about](https://karma-community-kc.com/about) — production About.
- In-repo MVP About — `aboutContent*.ts`.

### 19.1 Founder selections (integrated into v1.0)

| ID | Theme | Integration |
|---|---|---|
| א | Fragmentation / duplication / trust | Problems — §4.2, §5.3 |
| ב | Community ↔ freedom dissonance | Problems — §5.3 |
| ג | Quotes + principles | §7.1b, §16 |
| ד | Quiet good + Israeli connected society | §5.2, §9.1 |
| ה | Founder (legacy + interview) | §3.1, §9.2 bioFull |
| ו | 5-step how | §7.3 (3-step today + 5-step vision) |
| ז | "For everyone" inclusion | §7.2 |
| ט | Logo evolution | §2.3 |
| י | Extended FAQ | §13 (12 items) |

**Explicitly out:** ח — Q1–Q4 2026 quarterly roadmap. Replaced by 4-phase roadmap (§6).

### 19.2 Legacy claims removed (would overclaim vs current product)

- Smart map / location-based discovery as live → Vision only (§7.3)
- Full encryption / org verification "before go-live" as done → removed
- "Nonprofit" as registered → **יוזמה** until registered (§4.5)
- iOS/Android apps shipped → web + early app, not store launch
- Food, volunteering, lessons as "available in app" → per category tier (§8)

---

## Appendix A — Full Hebrew copy bank (v1.0)

> **Authoritative source** for `aboutContent*.ts` and `donations.ts` strings. Keys match existing structure unless marked **(new key)**.

### A.1 `aboutContentCopyA`

```yaml
title: "אודות קהילת קארמה"
tagline: "הקיבוץ הקפיטליסטי — רשת של נתינה, בלי תמורה בין אנשים."

heroEyebrow: "קהילת קארמה · KC"
heroTitle: "לתת — זה גם לקבל."
heroSubtitle: |
  קיבוץ דיגיטלי שמחבר מי שיש לו עם מי שצריך.
  בלי כסף בין אנשים. בלי פרסומות. בלי מתווכים.

numbersTitle: "הקהילה במספרים"
numbersLead: "מתעדכן בזמן אמת. צמיחה אמיתית, מתחילה בקטן."
numbersBody: |
  **חי:** משתמשים רשומים, פוסטים פתוחים, מסירות שהושלמו, אנשים בצוות
  (לחיצה על הצוות → דף הצוות עם פרופילים).

  **מה לא משתנה:** בחינם למשתמשים · בלי פרסומות · בלי מסחר בין אנשים · קוד פתוח 100%.

  תרומות לפרויקט (מחוץ לאפליקציה) יושבות בקופה עד שנירשם כעמותה.
  אז ייפתחו ערוצי תרומה רשמיים בתוך האפליקציה — בהסכמה, בשקיפות, אף פעם לא חובה.

problemsTitle: "אילו בעיות אנחנו באים לפתור"
visionTitle: "החזון"
```

### A.2 `aboutContentUxRefreshPartA` — toggles & vision

```yaml
scopeToggleMvp: "מה יש היום"
scopeToggleVision: "מה נבנה בהמשך"
scopeToggleHint: |
  המעבר בין "מה יש היום" ל"מה נבנה בהמשך" משנה רק את הסיפור כאן —
  לא את מה שכבר עובד אצלכם באפליקציה.

visionLead: |
  בעולם רועש אנחנו מאמינים בכוח השקט של עשיית הטוב.
  קהילת קארמה (KC) היא רשת חברתית שמחברת בין אנשים — בין מי שצריך עזרה לבין מי שרוצה לתת.
  היום מתחילים מחפצים בחינם; בהמשך — עוד דרכים לעזור, בקצב שמכבד בטיחות.

visionQuotesIntro: "כמה משפטים שמלווים אותנו:"
visionQuote1: "«לתת זה גם לקבל»"
visionQuote2: "«לכל אחד יש משהו שהוא צריך, ומשהו שהוא שמח לתת»"

visionPurposeTitle: "ייעוד"
visionPurposeItems:
  - "לחבר בין מי שיש לו מה לתת לבין מי שצריך — בכבוד ובבירור."
  - "להפוך את «מישהו פה בטוח יעזור לי» לשגרה, לא לחריגה."
  - "לבנות אמון דרך מוצר שקוף — לא דרך הבטחות ריקות."

visionBusinessTitle: "איך נדע שהצלחנו"
visionBusinessBody: |
  נמדוד חיבורים אמיתיים, מסירות שהושלמו, פחות בזבוז, וזמן שנחסך למשפחות.
  נפרסם בגילוי לב מה נמדד ואיך — גם כשהמספרים לא «יפים».

visionBridgeTitle: "על מה זה נשען"
visionBridgeBody: |
  שקיפות, אחדות, קהילה, התחדשות ואמינות.
  פרטיות — כשזה נכון לכם, לא כהסתרה של המערכת.

visionExpandTitle: "עוד על החזון והלוגו"
visionExpandBody: |
  בטווח הארוך אנחנו רוצים מקום אחד שמרכז עשייה טובה: חפצים, זמן, ידע, קשר לעמותות —
  בלי מסחר בין אנשים, בלי פרסומות, בלי למכור את המשתמשים.
  אם משהו לא עובד — נגיד, נתקן, ונמשיך.

  בלוגו: K ו-C, לב, שיקוף ועולם — אותו סיפור בכל הגרסאות (ראו «איך הלוגו התפתח» בהמשך).

  «השאריות של האחד יכול להיות האוצר של מישהו אחר» — זה גם עקרון וגם מציאות בשטח.

logoEvolutionTitle: "איך הלוגו התפתח"  # (new key)
logoEvolutionLead: "הלוגו נהיה ברור יותר, אבל הסיפור נשאר: KC, לב, עולם, שיקוף."
logoEvolutionBody: |  # (new key) — Hebrew block from §2.3 verbatim
```

### A.3 Problems

**מה יש היום (`problemsItemsMvp`):**

| title | body |
|---|---|
| עזרה מפוזרת וכפולה | קבוצות וואטסאפ, עמותות ואתרים — כל אחד לבד. קשה לדעת על מי לסמוך ואיפה באמת צריך. |
| בושה לבקש עזרה | הרבה אנשים נשארים עם הצורך לבד — «לא מגיע לי» או «זה מביך». |
| פער בין נותן למקבל | מי שיש לו לא תמיד יודע למי זה משנה; מי שצריך לא תמיד יודע איפה לחפש. |
| פלטפורמות שלא בנויות לקהילה | פרסומות, רעש, או חוסר טכנולוגיה — ופחות דאגה לאנשים. |

**מה נבנה בהמשך (`problemsItemsVision`):**

| title | body |
|---|---|
| מקום אחד לעשייה טובה | לרכז נתינה, התנדבות וקשר לעמותות — בלי כפילויות ובלי אינטרס מסחרי. |
| קהילה בלי כפייה | ביחד וחופש יחד: שיתוף מרצון, בלי «חובה להצטרף» לכל דבר. |
| פחות בזבוז, יותר שימוש חוזר | חפצים, מזון בסיס וידע זזים בין אנשים — פחות «קנה וזרוק». |
| בטיחות ושקיפות שגדלות | כלים קהילתיים ופיקוח ברור — בלי למכור את המשתמשים. |
| הרחבת סוגי העזרה | זמן, מומחיות, קמפיינים — רק כשההגנות מוכנות. |

### A.4 Features

**מה יש היום (`featuresBulletsMvp`):**

- פרסום מסירות ובקשות — פוסט ברור, אזור, תמונה.
- צ׳אט לתיאום — בלי לחשוף טלפון לפני שבוחרים.
- פרטיות בשליטה — פרופיל, מעקב, דיווחים.
- סגירת מסירה — סימון שהגיע לידיים הנכונות.
- **9 קטגוריות תרומה** — חפצים מלא, זמן וכסף עם אינטגרציות, 6 קטגוריות עם קישורים אוצרים לעמותות.

**מה נבנה בהמשך (`featuresBulletsVision`):**

- **זרמים פנימיים לכל 9 הקטגוריות** — לא רק קישורים חיצוניים.
- **ערוץ תרומה בתוך האפליקציה** — אחרי רישום עמותה.
- **מנגנון הצבעות לכל המשתמשים** — להשפיע על מפת הדרכים.
- מפה — לראות מה קורה ליד הבית (עדיין לא זמין).
- התאמות חכמות יותר — פחות רעש, יותר רלוונטיות.

### A.5 Goals

**מה יש היום (`goalsItemsMvp`):**

| title | body |
|---|---|
| מסירה ובקשה שגרתיים ובטוחים | פחות חיכוך, יותר בהירות — מהרגע הראשון ועד אחרי המסירה. |
| פחות בזבוז | חפצים שממשיכים למקום חדש, במקום להיסגר במגירה או להיזרק. |
| אמון דרך מוצר אמיתי | לא «סלוגנים» — אלא התנהגות עקבית, דיווחים, ותמיכה. |

**מה נבנה בהמשך (`goalsItemsVision`):**

| title | body |
|---|---|
| קהילה שמחזיקה את עצמה | מובילי קהילה, כלים בריאים, ותחושת אחריות הדדית. |
| השפעה רחבה בלי למכור משתמשים | להישאר נאמנים למודל ללא תמורה כספית בין אנשים. |
| מדידה שקופה של הטוב בשטח | לספר את האמת — גם כשזה לא נוח, כדי לשפר. |
| להרחיב נתינה — בקצב נכון | זמן, מומחיות וקמפיינים — כשהבטיחות קודמת לצמיחה. |

### A.6 `aboutContentCopyB`

```yaml
featuresTitle: "מה יש באפליקציה"
howItWorksTitle: "איך זה עובד"
howItWorksText: |
  1. מפרסמים — מה יש לתת או מה מחפשים, עם תמונה ואזור.

  2. מתאמים — מדברים בצ׳אט באפליקציה, קובעים מקום ושעה. אין חובה לתת טלפון.

  3. סוגרים — מסמנים שהמסירה בוצעה. בלי כסף, בלי עמלה, בלי מתווך.

  הכל בחינם, הכל שקוף, הכל בין אנשים.

howItWorksVisionText: |  # (new key)
  כשהמוצר יבשל, התהליך יכלול גם:
  הצטרפות מהירה → פרסום או חיפוש → מפה ליד הבית (בדרך) → צ׳אט → מסירה וסגירה.

audienceTitle: "למי זה מתאים"
audienceText: |
  לכל מי שרוצה לתת או לקבל — בלי הבדלים ובלי שיפוט.
  משפחות שמצמצמות חפצים, סטודנטים, עולים, קשישים, שכנים וקהילות מקומיות —
  וכל מי שמעדיף לתת ולקבל דרך אנשים, לא דרך זירת מכירות.
  בשלב הראשון מתמקדים באנשים פרטיים. עמותות וארגונים — בהמשך, אחרי קהילה חזקה.

valuesTitle: "הערכים שלנו"
```

### A.7 `aboutContentCopyC` — roadmap, contributions

```yaml
roadmapTitle: "מפת הדרכים — שלבים אל החזון"
contributionsTitle: "9 דרכים לתת — כולן חיות באפליקציה היום"
contributionsText: |
  היום בלשונית "תרומות": חפצים מלאים, זמן וכסף עם אינטגרציות,
  ועוד 6 קטגוריות עם קישורים אוצרים לעמותות.

  יש המון דרכים לתת. אנחנו לא נגביל אתכם רק למה שבנינו —
  KC הוא ה**מרכז** של עשייה טובה, לא רק האפליקציה שלנו.
  ייפתחו לפעולה ישירה לפי הקצב שמכבד בטיחות ואמון.
```

**Tiles (`available` flag in code):**

| Tile | `available` | Note |
|---|---|---|
| חפצים וציוד | `true` | Full app (Tier 1) |
| זמן והתנדבות | `false` (bridge) | Lev Echad + direct channel (Tier 2) |
| כסף | `false` (bridge) | Jgive + Bit/PayBox (Tier 2) |
| אוכל | `false` | Curated links (Tier 3) |
| דיור | `false` | Curated links (Tier 3) |
| תחבורה | `false` | Curated links (Tier 3) |
| ידע | `false` | Curated links (Tier 3) |
| חיות | `false` | Curated links (Tier 3) |
| רפואה | `false` | Curated links (Tier 3) |

### A.8 `aboutContentUxRefreshPartB`

```yaml
missionTeamIntro: |
  קהילת קארמה (KC) היא רשת חברתית לעשייה טובה — מתחילים ממסירת חפצים בחינם, בלי מסחר בין אנשים.
  היום אנחנו יוזמה שבונה את המוצר עם קהילה מוקדמת; בקרוב נירשם כעמותה בישראל.
  הקוד שלנו פתוח, הצוות שלנו קטן, והדרך — חלק מהסיפור.

teamRoles.founder.role: "מייסד הפרויקט"

teamRoles.founder.bio: |
  נוה, מייסד קארמה. בניתי את הפרויקט הזה אחרי שהבנתי שבעולם הנתינה לא חסר כסף —
  חסרים ידע, שקיפות וטכנולוגיה.

teamRoles.founder.bioFull: |
  בעולם הפילנתרופיה לא חסר כסף. חסרים ידע, שקיפות, טכנולוגיה ויעילות.

  את התובנה הזו נשאתי שנים בלי שידעתי שזה הפרויקט שלי. גדלתי במשפחה דתית-ציונית.
  עוד בתיכון, בזכות סביבה שדחפה להצטיין, סיימתי תואר במדעי המחשב; במקביל התחלתי לשאול
  שאלות אמיתיות על מי אני. **חזרתי בשאלה.**

  אחרי מכינה מעורבת — פילוסופיה, מפגש עם שכבות החברה הישראלית — התגייסתי
  ל**יחידת אופק 324, תת-יחידה מא"ב** — יחידה טכנולוגית בחיל האוויר, פיתוח קוד למטוסי קרב.
  בכל החיים שלי עד אז הייתי מוקף באנשים שרצו להצטיין. בצבא ראיתי את הניגוד: הרבה חכמים,
  מעטים מצוינים, פרויקטים איטיים, יחס אישי לא תמיד מכבד. הניגוד הזה לימד אותי משהו על קהילה:
  לקהילה עם חזון ברור וכלים חזקים יש כוח אדיר.

  את אותה תובנה רציתי להחיל על עולם הנתינה — שעבד עליי שנים, אבל בלי כלים, בלי טכנולוגיה,
  בלי שקיפות. התחלתי בקטן ("לחבר גמ"חים לרשתות חברתיות"), עברתי לרשת חברתית לעשייה טובה,
  והגעתי לחזון של **פייסבוק לפילנתרופיה** — מקום אחד שמרכז כל סוג של עשייה טובה: חפצים,
  זמן, כסף, ידע — בעולם כולו.

  היום אנחנו בצעד הראשון: אפליקציה למסירת חפצים בחינם, בעברית, בישראל.
  עוד מעט אנשים, עוד הרבה דרך. זה בדיוק המקום שבו דברים אמיתיים מתחילים.

teamProfileLinkLabel: "לפרופיל בקהילה"  # (new key)
teamStoryExpandMore: "הסיפור המלא"  # (new key)
teamStoryExpandLess: "פחות"  # (new key)

valuesText: |
  שקיפות, אחדות, קהילה, התחדשות, אמינות — ואנונימיות כבחירה.
  נתינה היא לשני הצדדים. לכל אחד יש מה לתרום ומה לבקש.
  מה שמישהו לא צריך יכול לשנות את היום של מישהו אחר.
```

### A.9 NEW — Governance & Money copy

```yaml
governanceTitle: "המסגרת"  # (new key)
governanceBody: |  # (new key)
  היום אני (נוה) מחליט, ויש 2-3 מתנדבים שעוזרים. קטן, גמיש, מהיר.

  **כשנירשם כעמותה:** ועד מנהל, מנכ"ל וועדת ביקורת לפי חוק.
  ובנוסף — **תקנון ברזל שלא ניתן לשינוי.** הערכים נעולים — גם אם יתחלפו ראשי הארגון.

  **בעתיד הרחוק:** הצבעה דמוקרטית לכל המשתמשים, מעל החוקה הקבועה.
  המסגרת קבועה. הקהילה מחליטה את הדרך.

moneyTitle: "כסף — שלוש שכבות, קו אחד אדום"  # (new key)
moneyBody: |  # (new key)
  **קו אדום שלא משתנה לעולם:** כסף לא עובר בין אנשים. אפס עמלות. אפס פרסומות.

  **היום:** תרומות לפרויקט מחוץ לאפליקציה (ביט/פייבוקס), יושבות בקופה עד רישום עמותה.
  תרומות לעמותות אחרות — דרך Jgive בלשונית כסף.

  **בקרוב (אחרי רישום עמותה):** ערוץ תרומה לפרויקט בתוך האפליקציה —
  בהסכמה, בשקיפות, אף פעם לא חובה.

  **בהמשך:** KC כצינור שקוף לתרומות לעמותות אחרות בעולם.
```

### A.10 FAQ — `faqItems` (12)

```yaml
faqItems:
  - q: "האם השימוש עולה כסף? האם יש פרסומות?"
    a: |
      לא. קהילת קארמה היא יוזמה ללא מטרות רווח מהמשתמשים.
      אין מסחר בין אנשים, אין עמלות, ואין פרסומות באפליקציה.
      העזרה ההדדית צריכה להישאר נגישה לכולם.

  - q: "איך מתחילים?"
    a: |
      נכנסים לאפליקציה או לאתר, נרשמים בקצרה, ומפרסמים בקשה או הצעה —
      או עוברים על מה שקורה באזור. אפשר גם מצב אורח, לפי מה שזמין אצלכם.

  - q: "מה יש היום — ומה עדיין בדרך?"
    a: |
      היום: חפצים מלא, ועוד 8 קטגוריות בלשונית "תרומות" עם אינטגרציות וקישורים.
      בהמשך: זרמים פנימיים לכל הקטגוריות, ערוץ תרומה לפרויקט בתוך האפליקציה,
      וכלים לעמותות — תמיד בלי תמורה בין אנשים, ובקצב זהיר.

  - q: "מה זה «קיבוץ דיגיטלי»?"
    a: |
      קהילה מרצון: לתת, לקבל, לשתף — כמו בקיבוץ, אבל בעולם דיגיטלי מודרני.
      בלי חובה להשתתף בכל דבר, בלי עמלות, בלי למכור אתכם.

  - q: "מה ההבדל בינינו לקבוצות וואטסאפ או ליד2?"
    a: |
      אנחנו לא זירת מכירות ולא עוד קבוצה מפוזרת.
      מקום אחד שקוף לנתינה — חינם, בלי פרסומות, עם כללים ודיווחים שמגנים על הקהילה.

  - q: "איך שומרים על בטיחות ופרטיות?"
    a: |
      יש מצבי פרטיות, דיווחים וכללי שימוש. אפשר לבחור מה לחשוף.
      אנחנו משפרים ככל שהקהילה גדלה — בלי להבטיח «מאובטח ב־100%».

  - q: "האם אפשר לתרום כסף דרך האפליקציה?"
    a: |
      היום: תמיכה בקארמה רק מחוץ לאפליקציה (ביט/פייבוקס), והכסף יושב בקופה עד שנירשם כעמותה.
      אחרי רישום: נפתח ערוץ בתוך האפליקציה — בהסכמה ובשקיפות, ולעולם לא חובה.
      תרומה לעמותות אחרות אפשרית היום דרך Jgive בלשונית «כסף».

  - q: "איפה אפשר להשתמש?"
    a: |
      אנחנו בשלב השקה: אפליקציה ואתר בפיתוח מתמשך.
      המטרה — חוויה יציבה לפני פרסום בחנויות. בינתיים אפשר להשתמש במה שכבר פתוח.

  - q: "האם הקוד פתוח?"
    a: |
      כן. הקוד תמיד היה ותמיד יישאר ציבורי בגיטהאב.
      שקיפות מלאה, גם בקוד שמפעיל את כל זה.

  - q: "איך אפשר לעזור לפרויקט?"
    a: |
      להשתמש, לשתף עם חברים, לתת פידבק, להוסיף קישורים בלשונית "תרומות",
      לפתוח קוד בגיטהאב, או להצטרף כמתנדבים.
      פרטים ב«יצירת קשר» ו«רוצים להצטרף למסע?».

  - q: "איך משפיעים על מפת הדרכים?"
    a: |
      דרך «דיווח על בעיה» בהגדרות, במייל או ברשתות.
      בעתיד הרחוק — מנגנון הצבעה פתוח לכל המשתמשים, על גבי תקנון ברזל קבוע.

  - q: "למה «קארמה» ומה זה KC?"
    a: |
      קארמה — מעגליות: מה שיוצא לקהילה חוזר כטוב.
      KC הוא קהילת קארמה, וגם קיבוץ קפיטליסטי: שיתוף מרצון בעולם טכנולוגי.
      במקלדת עברית, KC נקרא גם «לב».
```

### A.11 Nav / social / footer

- `socialCaption`: keep warm, plain.
- `footerRights`: «© 2026 קהילת קארמה»

---

## 20. Changelog

| Date | Version | Change |
|---|---|---|
| 2026-05-26 | v0.1 | Initial master narrative from founder interview |
| 2026-05-26 | v0.2 | Progressive disclosure + team card pattern |
| 2026-05-26 | v0.3 | Legacy marketing About inventory |
| 2026-05-26 | v0.4 | Founder legacy integration checklist |
| 2026-05-26 | v0.5 | Map Vision-only; plain Hebrew rules; How 3 vs 5 steps |
| 2026-05-26 | v0.6 | Quotes א+ב+ג (verbatim + adapted + key phrase) |
| 2026-05-26 | v0.7 | Logo evolution §2.3 |
| 2026-05-26 | v0.8 | FAQ ×12; Appendix A full Hebrew copy bank |
| 2026-05-26 | **v1.0** | **Founder-approved master narrative.** Adds: editorial doctrine (§1.5), narrative arc "wide platform, seed community" (§1.6), brand identity visual (§2.4), operational truth (§4.6), unified voice (§7.4), 9-category tile model with 3-tier depth (§8), 3-stage governance (§10), 3-layer money model (§11), internationalization (§12), slogan bank (§16). Locks: bio + bioFull (§3.1, §9.2) with יחידת אופק 324 + מא"ב, logo-5.png as canonical, font intentionally open. Resolves §14 open items. FAQ updated with money/governance/OSS answers. Hero locks brand essence ("לתת — זה גם לקבל") + mechanism ("בלי כסף בין אנשים"). |
