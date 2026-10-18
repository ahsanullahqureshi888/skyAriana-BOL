import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

let _pool: Pool | null = null
let _db: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bol_ledger'
    _pool = new Pool({
      connectionString: url,
    })
    _db = drizzle(_pool, { schema })
  }
  return _db
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const instance = getDb()
    const val = (instance as any)[prop]
    return typeof val === 'function' ? val.bind(instance) : val
  }
})
