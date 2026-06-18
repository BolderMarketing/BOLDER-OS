// Voice memo transcription via OpenAI Whisper.
// Twilio sends a MediaUrl for audio; we download it (Twilio basic-auth) and
// pass the bytes to Whisper.
import OpenAI from 'openai';
import { env } from './env.js';

let _client = null;
function client() {
  if (!_client) {
    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured.');
    _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _client;
}

// Download Twilio-hosted media (requires account auth).
async function downloadTwilioMedia(url) {
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`Failed to download media: ${res.status}`);
  const contentType = res.headers.get('content-type') || 'audio/ogg';
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, contentType };
}

// Transcribe a Twilio media URL. Returns the plain transcript string.
export async function transcribeTwilioVoice(mediaUrl) {
  const { buf, contentType } = await downloadTwilioMedia(mediaUrl);
  const ext = contentType.includes('mpeg') ? 'mp3' : contentType.includes('wav') ? 'wav' : 'ogg';
  // The OpenAI SDK accepts a web File in Node 20+.
  const file = new File([buf], `voice-memo.${ext}`, { type: contentType });
  const resp = await client().audio.transcriptions.create({
    file,
    model: 'whisper-1',
  });
  return resp.text?.trim() || '';
}
