import { Router } from 'express';
import { z } from 'zod';
import { sendEmailOtp, verifyEmailOtp } from '../services/notificationService.js';

const router = Router();
const emailSchema = z.object({ email: z.string().email() });
const verifySchema = emailSchema.extend({ code: z.string().regex(/^\d{6}$/, 'OTP must be six digits.') });

router.post('/auth/email-otp', async (req, res, next) => {
  try {
    const { email } = emailSchema.parse(req.body);
    res.json({ data: await sendEmailOtp(email), meta: { generated_at: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/email-otp/verify', (req, res, next) => {
  try {
    const payload = {
      email: typeof req.body?.email === 'string' ? req.body.email.trim() : req.body?.email,
      code: typeof req.body?.code === 'string' ? req.body.code.trim() : req.body?.code,
    };
    const { email, code } = verifySchema.parse(payload);
    if (!verifyEmailOtp(email, code)) return res.status(400).json({ message: 'That code is invalid or has expired.' });
    res.json({ data: { verified: true }, meta: { generated_at: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

export default router;