import axios from 'axios';

const ZEPTO_API_URL = 'https://api.zeptomail.com/v1.1/email/template';
const FROM_NAME = 'Chopie';

export async function sendTemplateEmail(
  to,
  templateAlias,
  mergeInfo
) {
  try {
    const apiKey = process.env.ZEPTO_API_KEY;
    const fromEmail = process.env.ZEPTO_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      console.warn('[Email] ZeptoMail not configured — skipping send to:', to.email);
      console.log('[Email] Template:', templateAlias, '| Data:', mergeInfo);
      return;
    }

    await axios.post(
        ZEPTO_API_URL,
        {
          from: { address: fromEmail, name: FROM_NAME },
          to: [{ email_address: { address: to.email, name: to.name } }],
          template_alias: templateAlias,
          merge_info: mergeInfo,
        },
        {
          headers: {
            Authorization: apiKey,
            'Content-Type': 'application/json',
          },
        }
    );
  } catch (err) {
    console.error('[Email] Failed to send to:', to.email);
    console.error('[Email] Template:', templateAlias);
    console.error('[Email] Error:', err.response?.data || err.message);
  }
}

export const EMAIL_TEMPLATES = {
  PASSWORD_RESET: 'password-reset',
  WELCOME: 'welcome',
  PENDING_REVIEW: 'pending-review'
};