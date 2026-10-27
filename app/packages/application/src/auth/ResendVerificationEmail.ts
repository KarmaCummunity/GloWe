/** FR-AUTH-006 (MVP gate): resend signup verification email. */
import type { IAuthService } from '../ports/IAuthService';
import { AuthError } from './errors';

/** RFC 5321 max address length; bounds regex work on hostile input. */
const MAX_EMAIL_LENGTH = 254;

/** `local@domain.tld` shape check without a backtracking regex. */
function looksLikeEmail(email: string): boolean {
  if (email.length > MAX_EMAIL_LENGTH || /\s/.test(email)) return false;
  const at = email.indexOf('@');
  if (at <= 0 || at !== email.lastIndexOf('@')) return false;
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}

export interface ResendVerificationEmailInput {
  email: string;
  emailRedirectTo?: string;
}

export class ResendVerificationEmailUseCase {
  constructor(private readonly auth: IAuthService) {}

  async execute(input: ResendVerificationEmailInput): Promise<void> {
    const email = input.email.trim().toLowerCase();
    if (!looksLikeEmail(email)) {
      throw new AuthError('invalid_email', 'invalid_email');
    }
    await this.auth.resendVerificationEmail(email, {
      emailRedirectTo: input.emailRedirectTo,
    });
  }
}
