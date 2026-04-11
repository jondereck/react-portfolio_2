import { Resend } from 'resend';
import { z } from 'zod';
import { isRateLimited } from '@/lib/server/rate-limit';

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
  if (isRateLimited(req, 'contact-submit', 8, 60_000)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const payload = await req.json();
    const parsed = contactSchema.safeParse(payload);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid contact payload' }, { status: 400 });
    }

    const name = escapeHtml(parsed.data.name);
    const email = escapeHtml(parsed.data.email);
    const message = escapeHtml(parsed.data.message).replace(/\n/g, '<br/>');

    await resend.emails.send({
      from: 'Portfolio <onboarding@resend.dev>', // default works
      to: 'jonderecknifas@gmail.com', // 🔥 change to your email
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
    return Response.json({ error: 'Failed to send' }, { status: 500 });
  }
}
