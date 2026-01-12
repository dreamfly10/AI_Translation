import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { createNextErrorResponse, ErrorCodes } from '@/lib/error-handler';

// Helper to count words
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

const supportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string()
    .min(1, 'Message is required')
    .refine((msg) => countWords(msg) >= 10, {
      message: 'Message must contain at least 10 words',
    }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = supportSchema.parse(body);

    if (!process.env.RESEND_API_KEY) {
      const error = createNextErrorResponse({ code: ErrorCodes.SERVER_ERROR }, 'Support Email Config');
      return NextResponse.json({ error: error.error, message: error.message }, { status: error.status });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const supportEmail = process.env.SUPPORT_EMAIL || 'haofu99@gmail.com';

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Expression Copilot <onboarding@resend.dev>',
      to: supportEmail,
      replyTo: email,
      subject: `Support Request: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
            New Support Request
          </h2>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>From:</strong> ${name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
          </div>
          <div style="background: #fff; padding: 20px; border-left: 4px solid #6366f1; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Message:</strong></p>
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This email was sent from the Expression Copilot support form.
          </p>
        </div>
      `,
      text: `
New Support Request

From: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
      `.trim(),
    });

    if (error) {
      const sanitized = createNextErrorResponse(error, 'Resend Email');
      return NextResponse.json({ error: sanitized.error, message: sanitized.message }, { status: sanitized.status });
    }

    console.log('Support email sent successfully:', data?.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Support request sent successfully',
      id: data?.id 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      const errorMessage = firstError?.message || 'Please check your form inputs';
      return NextResponse.json(
        { 
          error: ErrorCodes.INVALID_INPUT,
          message: errorMessage
        },
        { status: 400 }
      );
    }

    // All errors are sanitized - no backend details exposed
    const sanitized = createNextErrorResponse(error, 'Support Request');
    return NextResponse.json({ error: sanitized.error, message: sanitized.message }, { status: sanitized.status });
  }
}

