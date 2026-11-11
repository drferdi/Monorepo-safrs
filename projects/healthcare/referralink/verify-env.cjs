#!/usr/bin/env node

const required = [
  'SANDBOX_AUTH_SECRET',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'APP_URL',
  'GEMINI_API_KEY',
]

console.log('\nMedlink environment verification\n')

let missing = 0
for (const key of required) {
  const present = Boolean(process.env[key])
  console.log(`${present ? 'OK ' : 'MISS'} ${key}`)
  if (!present) missing++
}

if (missing > 0) {
  console.log(`\nMissing ${missing} required environment variable(s).\n`)
  process.exit(1)
}

console.log('\nAll required environment variables are present.\n')
