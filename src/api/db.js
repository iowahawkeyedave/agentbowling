import { createClient } from '@libsql/client';
import * as schema from './schema.js';

const url = process.env.TURSO_DATABASE_URL || 'file:./local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export const client = createClient({
  url,
  authToken,
});

export function getDb() {
  return { client, schema };
}

export { schema };
