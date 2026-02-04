import { Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../db/schema';

let client: Client | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL || 'file:./local.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    client = createClient({ url, authToken });
    db = drizzle(client, { schema });
  }
  return db;
}

function createClient(config: { url: string; authToken?: string }): Client {
  return {
    name: 'libsql',
    url: config.url,
    authToken: config.authToken,
    async execute({ sql, args }) {
      const response = await fetch(`${config.url.replace(/\/$/, '')}/v2/pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statements: [sql, ...(args || [])],
        }),
      });
      
      const result = await response.json();
      return {
        rows: result.results?.[0]?.rows || [],
        affectedRowCount: result.results?.[0]?.affected_row_count || 0,
      };
    },
  } as any;
}
