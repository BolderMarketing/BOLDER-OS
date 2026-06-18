// Twilio inbound webhook. Validates X-Twilio-Signature before doing anything.
// Handles SMS text commands and voice-memo intake (Whisper transcription).
// NOTE: this router is mounted WITHOUT requireAuth (Twilio can't send a JWT),
// so signature validation is the gate. It is the only unauthenticated route.
import { Router } from 'express';
import { validateTwilioSignature, twimlReply, sendSms } from '../../lib/twilio.js';
import { transcribeTwilioVoice } from '../../lib/whisper.js';
import { parseAndExecute } from '../../lib/intake.js';
import { env } from '../../lib/env.js';

const router = Router();

// POST /api/webhooks/twilio
router.post('/', async (req, res) => {
  // Reject anything not signed by Twilio.
  if (!validateTwilioSignature(req)) {
    return res.status(403).type('text/plain').send('Invalid signature');
  }

  // Only accept commands from Faris's number.
  const from = req.body.From;
  if (env.FARIS_PHONE_NUMBER && from !== env.FARIS_PHONE_NUMBER) {
    return res.status(200).type('text/xml').send(twimlReply('Not authorized.'));
  }

  try {
    let commandText = (req.body.Body || '').trim();

    // Voice memo: Twilio includes MediaUrl0 + MediaContentType0 for attachments.
    const numMedia = parseInt(req.body.NumMedia || '0', 10);
    if (numMedia > 0 && /audio\//.test(req.body.MediaContentType0 || '')) {
      const transcript = await transcribeTwilioVoice(req.body.MediaUrl0);
      commandText = transcript || commandText;
    }

    const reply = await parseAndExecute(commandText);
    // Confirm every action back to Faris via the TwiML response.
    return res.status(200).type('text/xml').send(twimlReply(reply));
  } catch (e) {
    console.error('[twilio webhook]', e);
    return res
      .status(200)
      .type('text/xml')
      .send(twimlReply('Hit an error processing that. Check the OS.'));
  }
});

export default router;
