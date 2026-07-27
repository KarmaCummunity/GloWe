// HTML + subject lines for GloWe transactional email (FR-GLOWE-003 AC8 / FR-GLOWE-012 AC9).
// Hebrew-first copy — GloWe MVP targets Israeli users (R-MVP-Core-4).

export type GloweEmailTemplate =
  | 'org_approved'
  | 'org_rejected'
  | 'application_accepted'
  | 'application_declined';

export interface GloweEmailContent {
  subject: string;
  html: string;
  text: string;
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrap(body: string): string {
  return `<!DOCTYPE html><html lang="he" dir="rtl"><body style="font-family:Arial,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">${body}<p style="margin-top:32px;font-size:12px;color:#666;">GloWe — קהילה לידע, תמיכה ופעולה משותפת.</p></body></html>`;
}

export function buildGloweEmail(
  template: GloweEmailTemplate,
  payload: Record<string, unknown>,
  siteUrl: string
): GloweEmailContent {
  const orgName = esc(payload.org_name || 'הארגון שלך');
  const listing = esc(payload.listing_title || 'הבקשה שלך');
  const organization = esc(payload.organization || '');
  const note = esc(payload.note || '');
  const home = siteUrl.replace(/\/$/, '');

  switch (template) {
    case 'org_approved':
      return {
        subject: 'הארגון שלך אושר ב-GloWe',
        html: wrap(`
          <h2 style="margin:0 0 16px;">ברוכים הבאים, ${orgName}</h2>
          <p>בקשת הארגון שלכם אושרה. מעכשיו אפשר לפרסם התנדבויות, אירועים ופוסטים ב-GloWe.</p>
          <p><a href="${home}/pages/volunteer-network.html">פתחו את רשת ההתנדבות</a></p>
        `),
        text: `הארגון ${orgName} אושר ב-GloWe. ${home}/pages/volunteer-network.html`,
      };
    case 'org_rejected':
      return {
        subject: 'עדכון לגבי בקשת הארגון ב-GloWe',
        html: wrap(`
          <h2 style="margin:0 0 16px;">בקשת הארגון דורשת עדכון</h2>
          <p>בקשת הארגון <strong>${orgName}</strong> לא אושרה בשלב זה.</p>
          ${note ? `<p style="background:#f5f5f5;padding:12px;border-radius:8px;"><strong>הערת הצוות:</strong><br>${note}</p>` : ''}
          <p>אפשר לעדכן את הפרטים ולשלוח מחדש מהאזור האישי.</p>
          <p><a href="${home}/pages/my-applications.html">פתחו את האזור האישי</a></p>
        `),
        text: `בקשת הארגון ${orgName} לא אושרה.${note ? ` הערה: ${note}` : ''} ${home}/pages/my-applications.html`,
      };
    case 'application_accepted':
      return {
        subject: `אושרתם — ${listing}`,
        html: wrap(`
          <h2 style="margin:0 0 16px;">הבקשה שלכם אושרה</h2>
          <p>אושרתם ל<strong>${listing}</strong>${organization ? ` אצל ${organization}` : ''}.</p>
          <p>המארגן ייצור קשר עם הפרטים שמסרתם.</p>
          <p><a href="${home}/pages/my-applications.html">עקבו באזור האישי</a></p>
        `),
        text: `אושרתם ל-${listing}. ${home}/pages/my-applications.html`,
      };
    case 'application_declined':
      return {
        subject: `עדכון לגבי ${listing}`,
        html: wrap(`
          <h2 style="margin:0 0 16px;">עדכון לגבי הבקשה שלכם</h2>
          <p>הבקשה ל<strong>${listing}</strong>${organization ? ` אצל ${organization}` : ''} לא התקבלה בשלב זה.</p>
          ${note ? `<p style="background:#f5f5f5;padding:12px;border-radius:8px;"><strong>הערת המארגן:</strong><br>${note}</p>` : ''}
          <p><a href="${home}/pages/volunteer-network.html">גלו הזדמנויות נוספות</a></p>
        `),
        text: `הבקשה ל-${listing} לא התקבלה.${note ? ` הערה: ${note}` : ''}`,
      };
    default:
      throw new Error(`unknown template: ${template}`);
  }
}
