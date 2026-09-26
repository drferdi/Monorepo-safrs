type SandboxVerificationEmailOptions = {
  email: string
  code: string
  expiresAt: string
}

function getPublicAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VITE_APP_URL) return process.env.VITE_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:5173'
}

function getSandboxEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  const fromName = process.env.RESEND_FROM_NAME || 'MEDLINK'

  if (!apiKey || !fromEmail) {
    throw new Error('Sandbox email provider is not configured')
  }

  return {
    apiKey,
    from: `${fromName} <${fromEmail}>`,
  }
}

export async function sendSandboxVerificationEmail(
  options: SandboxVerificationEmailOptions
): Promise<boolean> {
  const config = getSandboxEmailConfig()
  const appUrl = getPublicAppUrl()
  const expiryLabel = new Date(options.expiresAt).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const html = `
    <!DOCTYPE html>
    <html lang="id">
      <body style="font-family: Arial, sans-serif; background:#111111; color:#f4f4f4; margin:0; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#171717; border:1px solid #2f2f2f; padding:32px;">
          <p style="font-size:12px; letter-spacing:0.2em; color:#78a9ff; margin:0 0 12px;">MEDLINK // PUBLIC SANDBOX</p>
          <h1 style="font-size:28px; line-height:1.2; margin:0 0 16px;">Kode verifikasi sandbox Anda</h1>
          <p style="font-size:15px; color:#c6c6c6; margin:0 0 24px;">
            Gunakan kode berikut untuk membuka sandbox diagnosis rujukan sintetis. Email ini tidak memberi akses ke data pasien nyata atau workflow klinis live.
          </p>
          <div style="font-size:32px; font-weight:700; letter-spacing:0.35em; text-align:center; padding:18px 24px; border:1px solid #3f3f3f; background:#222222; margin:0 0 20px;">
            ${options.code}
          </div>
          <p style="font-size:14px; color:#c6c6c6; margin:0 0 8px;">Berlaku sampai: ${expiryLabel}</p>
          <p style="font-size:14px; color:#8d8d8d; margin:0 0 24px;">Buka kembali sandbox di ${appUrl} lalu masukkan kode tersebut.</p>
          <p style="font-size:12px; color:#6f6f6f; margin:0;">Jika Anda tidak meminta akses sandbox ini, abaikan email ini.</p>
        </div>
      </body>
    </html>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [options.email],
      subject: 'MEDLINK sandbox verification code',
      html,
      text: `Kode verifikasi sandbox MEDLINK Anda: ${options.code}. Berlaku sampai ${expiryLabel}.`,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Sandbox email send failed: ${response.status} ${body}`)
  }

  return true
}
