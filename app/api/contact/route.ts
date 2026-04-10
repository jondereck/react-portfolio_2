import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    await resend.emails.send({
      from: 'Portfolio <onboarding@resend.dev>', // default works
      to: 'your@email.com', // 🔥 change to your email
      subject: `New Contact from ${name}`,
      reply_to: email,
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