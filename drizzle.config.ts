{
  "$schema": "https://json.schemastore.org/drizzle",
  "driver": "turso",
  "dbCredentials": {
    "url": "env('TURSO_DATABASE_URL')",
    "authToken": "env('TURSO_AUTH_TOKEN')"
  },
  "out": "./drizzle",
  "verbose": true,
  "strict": true
}
