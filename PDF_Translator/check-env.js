import dotenv from 'dotenv'

// Load .env from server folder explicitly
dotenv.config({ path: './server/.env' })

const key = process.env.OPENAI_API_KEY

if (!key) {
  console.error('[check-env] OPENAI_API_KEY not found in server/.env')
  process.exit(1)
}

// Basic format checks (do not print the key)
const okPrefix = key.startsWith('sk-')
const okLength = key.length >= 30 && key.length <= 200

console.log('[check-env] OPENAI_API_KEY present')
console.log(`[check-env] startsWith sk-: ${okPrefix}`)
console.log(`[check-env] length OK (30-200): ${okLength} (length=${key.length})`)

if (!okPrefix || !okLength) {
  console.error('[check-env] OPENAI_API_KEY format looks unexpected. Please verify you copied the correct key into server/.env')
  process.exit(2)
}

console.log('[check-env] Looks good — do NOT paste this key publicly.')
process.exit(0)
