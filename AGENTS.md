# Agent Instructions

## Type Checking

After each turn that modifies TypeScript files, run:

```bash
pnpm type-check
```

Fix any type errors before completing your response.

## Database Migrations

Never write migration SQL files manually. When modifying the database schema in `lib/db/schema.ts`, use:

```bash
pnpm db:generate
```

This will auto-generate the migration file based on schema changes.

