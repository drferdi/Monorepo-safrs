import 'server-only'

import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM || 'Puskesmas Dashboard <noreply@puskesmasbalowerti.com>'

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return null
  return new Resend(apiKey)
}

/* ── Approval Email ── */

export async function sendApprovalEmail(
  to: string,
  fullName: string,
  username: string
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Akun Anda Telah Disetujui — Sentra Intelligence Dashboard',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 520px; margin: 0 auto; color: #333;">
          <div style="padding: 24px 0; border-bottom: 2px solid #E67E22;">
            <h2 style="margin: 0; color: #E67E22; font-size: 18px;">Sentra Intelligence Dashboard</h2>
          </div>
          <div style="padding: 24px 0;">
            <p style="margin: 0 0 16px;">Halo <strong>${escapeHtml(fullName)}</strong>,</p>
            <p style="margin: 0 0 16px;">Selamat! Pendaftaran akun Anda telah <strong style="color: #4CAF50;">disetujui</strong>.</p>
            <div style="background: #f8f8f8; border-radius: 8px; padding: 16px; margin: 0 0 16px;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #888;">Username</p>
              <p style="margin: 0; font-size: 16px; font-weight: 600;">${escapeHtml(username)}</p>
            </div>
            <p style="margin: 0 0 16px;">Silakan login ke dashboard menggunakan username dan password yang Anda daftarkan.</p>
            <p style="margin: 0; font-size: 13px; color: #888;">— Tim Puskesmas Intelligence</p>
          </div>
        </div>
      `,
    })
  } catch {
    // Email send failure — silent, non-blocking
  }
}

/* ── NOTAM Broadcast Email ── */

export async function sendNotamEmail(
  recipients: string[],
  title: string,
  body: string,
  priority: string
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const validRecipients = recipients.filter(e => e.includes('@'))
  if (validRecipients.length === 0) return

  const priorityColor =
    priority === 'urgent' ? '#dc3545' : priority === 'warning' ? '#E67E22' : '#888'
  const priorityLabel =
    priority === 'urgent' ? 'URGENT' : priority === 'warning' ? 'WARNING' : 'INFO'

  try {
    // Batch send — Resend supports up to 50 recipients per batch
    const batches: string[][] = []
    for (let i = 0; i < validRecipients.length; i += 49) {
      batches.push(validRecipients.slice(i, i + 49))
    }

    for (const batch of batches) {
      await resend.emails.send({
        from: FROM,
        to: batch,
        subject: `[NOTAM ${priorityLabel}] ${title}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 520px; margin: 0 auto; color: #333;">
            <div style="padding: 24px 0; border-bottom: 2px solid #E67E22;">
              <h2 style="margin: 0; color: #E67E22; font-size: 18px;">Sentra Intelligence Dashboard</h2>
            </div>
            <div style="padding: 24px 0;">
              <div style="display: inline-block; padding: 2px 10px; border-radius: 4px; background: ${priorityColor}15; color: ${priorityColor}; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; margin-bottom: 12px;">
                ${priorityLabel}
              </div>
              <h3 style="margin: 0 0 12px; font-size: 16px;">${escapeHtml(title)}</h3>
              <div style="background: #f8f8f8; border-radius: 8px; padding: 16px; margin: 0 0 16px; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
                ${escapeHtml(body)}
              </div>
              <p style="margin: 0; font-size: 13px; color: #888;">— NOTAM Puskesmas Intelligence</p>
            </div>
          </div>
        `,
      })
    }
  } catch {
    // NOTAM email send failure — silent, non-blocking
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
