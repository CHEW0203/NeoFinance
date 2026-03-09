# Financial Tracker and Analysis Setup

## Recommended Project Structure

```text
Financial-Tracker-and-Analysis/
|- prisma/
|  |- schema.prisma
|  |- seed.js
|- public/
|- src/
|  |- app/
|  |  |- api/
|  |  |  |- health/
|  |  |     |- route.js
|  |  |- dashboard/
|  |  |  |- page.js
|  |  |- transactions/
|  |  |  |- page.js
|  |  |- globals.css
|  |  |- layout.js
|  |  |- page.js
|  |- features/
|  |  |- dashboard/
|  |     |- components/
|  |        |- summary-card.js
|  |- lib/
|  |  |- data/
|  |  |  |- mock-dashboard.js
|  |  |- prisma.js
|- .env.example
|- jsconfig.json
|- package.json
```

## Environment Setup

1. Install Node.js LTS from the official website.
2. Open the project in VS Code.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Run `npx prisma generate`.
6. Run `npx prisma db push`.
7. Optional: run `node prisma/seed.js`.
8. Start the app with `npm run dev`.

## Recommended VS Code Extensions

- ESLint
- Prisma
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- GitLens
- Error Lens

## Why SQLite First

SQLite is the fastest way to get from zero to a working app. After your main
features are stable, you can switch Prisma from SQLite to PostgreSQL with small
schema changes.
