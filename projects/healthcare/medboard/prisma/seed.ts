/**
 * Seed script: create initial crew user accounts in the database.
 * Run: SEED_ADMIN_PASSWORD=<password> pnpm seed
 *
 * Password is never stored in source — supply via env var only.
 */
import { randomBytes, scrypt as scryptCallback } from 'node:crypto'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 64

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16)
    scryptCallback(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
      (err, derivedKey) => {
        if (err) return reject(err)
        const hash = [
          'scrypt',
          String(SCRYPT_N),
          String(SCRYPT_R),
          String(SCRYPT_P),
          salt.toString('base64url'),
          (derivedKey as Buffer).toString('base64url'),
        ].join('$')
        resolve(hash)
      }
    )
  })
}

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD?.trim()
  if (!password) {
    throw new Error(
      'SEED_ADMIN_PASSWORD environment variable is required.\n' +
        'Usage: SEED_ADMIN_PASSWORD=<password> pnpm seed'
    )
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.upsert({
    where: { username: 'sentraone' },
    update: {
      passwordHash,
      displayName: 'dr Ferdi Iskandar. SH MKN CLM CMDC',
      role: 'ADMIN',
      institution: 'Puskesmas Balowerti Kota Kediri',
      profession: 'Dokter',
      status: 'ACTIVE',
    },
    create: {
      username: 'sentraone',
      passwordHash,
      displayName: 'dr Ferdi Iskandar. SH MKN CLM CMDC',
      role: 'ADMIN',
      institution: 'Puskesmas Balowerti Kota Kediri',
      profession: 'Dokter',
      status: 'ACTIVE',
    },
  })

  console.log(`✓ User seeded: ${user.username} (${user.displayName}) — role: ${user.role}`)
}

main()
  .catch((e: unknown) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
