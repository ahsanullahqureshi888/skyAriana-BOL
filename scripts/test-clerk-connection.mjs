#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Simple .env.local parser to avoid external dependencies
function loadEnv() {
  const envPath = path.join(rootDir, '.env.local')
  if (!fs.existsSync(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf8')
  const env = {}
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      env[key] = val
    }
  })
  return env
}

async function run() {
  console.log('====================================================')
  console.log('🔍 Sky Ariana BOL — Clerk Backend API Connection Test')
  console.log('====================================================')

  const env = loadEnv()
  const secretKey = process.env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY

  if (!secretKey) {
    console.log('\n❌ Result: CLERK_SECRET_KEY is not configured.')
    console.log('   Please configure it in .env.local using:')
    console.log('   CLERK_SECRET_KEY=sk_test_... (or sk_live_...)')
    console.log('   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...\n')
    process.exit(1)
  }

  const maskedKey = secretKey.slice(0, 7) + '...' + secretKey.slice(-4)
  console.log(`\n🔑 Found CLERK_SECRET_KEY: ${maskedKey}`)

  try {
    // 1. Test Users API
    console.log('📡 Testing connection to Clerk Backend API...')
    const usersRes = await fetch('https://api.clerk.com/v1/users?limit=5', {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!usersRes.ok) {
      const errData = await usersRes.json().catch(() => ({}))
      console.error(`\n❌ Authentication Failed (HTTP ${usersRes.status}):`)
      console.error(JSON.stringify(errData, null, 2))
      process.exit(1)
    }

    const users = await usersRes.json()
    console.log(`✅ Success! Authentication verified.`)
    console.log(`   Fetched ${Array.isArray(users) ? users.length : 0} user record(s):`)

    if (Array.isArray(users)) {
      users.forEach((u, i) => {
        const email = u.email_addresses?.[0]?.email_address || 'No email'
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Anonymous'
        console.log(`   [${i + 1}] ID: ${u.id} | Name: ${name} | Email: ${email}`)
      })
    }

    // 2. Test Organizations API
    console.log('\n📡 Testing Organizations Endpoint...')
    const orgsRes = await fetch('https://api.clerk.com/v1/organizations?limit=5', {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (orgsRes.ok) {
      const orgs = await orgsRes.json()
      const orgList = Array.isArray(orgs) ? orgs : orgs.data || []
      console.log(`✅ Organizations API accessible. Total orgs retrieved: ${orgList.length}`)
      orgList.forEach((org, i) => {
        console.log(`   [${i + 1}] ID: ${org.id} | Name: ${org.name} | Members: ${org.members_count ?? 'N/A'}`)
      })
    } else {
      console.log(`ℹ️ Organizations endpoint returned HTTP ${orgsRes.status} (May require Organizations feature to be enabled in Clerk Dashboard).`)
    }

    console.log('\n====================================================')
    console.log('🎉 Clerk connection and scopes verified successfully!')
    console.log('====================================================\n')
  } catch (err) {
    console.error('❌ Network error communicating with Clerk API:', err.message)
    process.exit(1)
  }
}

run()
