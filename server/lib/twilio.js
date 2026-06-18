// Twilio helpers: signature validation + outbound SMS confirmations.
import twilio from 'twilio';
import { env } from './env.js';

let _client = null;
function client() {
  if (!_client) {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio not configured.');
    }
    _client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return _client;
}

// Validate X-Twilio-Signature against the raw POST params + full URL.
// Returns true/false; never throws on a malformed request.
export function validateTwilioSignature(req) {
  if (!env.TWILIO_AUTH_TOKEN) return false;
  const signature = req.headers['x-twilio-signature'];
  if (!signature) return false;

  // The URL Twilio signed must match exactly what was configured in the console.
  const base = (env.PUBLIC_URL || '').replace(/\/$/, '');
  const url = base ? `${base}${req.originalUrl}` : `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  try {
    return twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, req.body || {});
  } catch {
    return false;
  }
}

// Send an SMS confirmation back to Faris. Best-effort.
export async function sendSms(to, body) {
  if (!env.TWILIO_PHONE_NUMBER) {
    console.warn('[twilio] TWILIO_PHONE_NUMBER not set; skipping SMS send.');
    return null;
  }
  return client().messages.create({ to, from: env.TWILIO_PHONE_NUMBER, body });
}

// Build a TwiML <Response><Message> reply (used in the webhook response).
export function twimlReply(message) {
  const r = new twilio.twiml.MessagingResponse();
  if (message) r.message(message);
  return r.toString();
}

export { client as twilioClient };
