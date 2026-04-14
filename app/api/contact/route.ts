import { Resend } from 'resend';
import { z } from 'zod';
import { getAdminSettings } from '@/lib/server/admin-settings';
import { isRateLimited } from '@/lib/server/rate-limit';
import { createFormErrorResponse, createZodFormErrorResponse } from '@/lib/server/form-responses';

const resend = new Resend(process.env.RESEND_API_KEY);
const contactSchema = z.object({
  name: z.string().trim().min(3).max(60),
  email: z.string().trim().email().max(120),
  message: z.string().trim().min(10).max(800),
});

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    if (char === '>') return '&gt;';
    if (char === '"') return '&quot;';
    return '&#39;';
  });

export async function POST(req: Request) {
  if (await isRateLimited(req, 'contact-submit', 8, 60_000)) {
    return createFormErrorResponse({ error: 'Too many requests. Please try again later.', errorCode: 'RATE_LIMITED' }, 429);
  }

  try {
    const settings = await getAdminSettings();
    const payload = await req.json();
    const parsed = contactSchema.safeParse(payload);
    if (!parsed.success) {
      return createZodFormErrorResponse(parsed.error, { errorCode: 'INVALID_CONTACT_PAYLOAD' });
    }

    const name = escapeHtml(parsed.data.name);
    const email = escapeHtml(parsed.data.email);
    const message = escapeHtml(parsed.data.message).replace(/\n/g, '<br/>');

    await resend.emails.send({
      from: `${settings.integrations.contactSenderName} <${settings.integrations.contactSenderEmail}>`,
      to: settings.integrations.contactRecipientEmail,
      subject: `New Contact from ${name}`,
      replyTo: email,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });

    return Response.json({ success: true });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return createFormErrorResponse({ error: 'Malformed JSON request body.', errorCode: 'MALFORMED_JSON' }, 400);
    }

    return createFormErrorResponse({ error: 'Failed to send message.', errorCode: 'CONTACT_SEND_FAILED' }, 500);
  }
}
