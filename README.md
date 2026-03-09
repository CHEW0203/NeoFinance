# NeoFinance

NeoFinance is a finance tracking and analysis website designed to help users build strong money habits through consistent daily usage, clear insights, and practical decision support.

Unlike many basic expense trackers, NeoFinance is being built as a more intelligent and structured personal finance system with stronger analysis and guidance capabilities.

## Project Status

This project is currently in active development.

## Demo and Report

- YouTube Link: [TBD]()
- Report Link: [TBD]()

## Tech Stack

- Frontend: Next.js (App Router) + React
- Backend: Next.js Route Handlers (Node.js runtime)
- Language: JavaScript
- Database ORM: Prisma
- Database (local development): SQLite
- Styling: Tailwind CSS

## Prerequisites

1. Install Node.js LTS from [nodejs.org](https://nodejs.org/).
2. Install Git from [git-scm.com](https://git-scm.com/) (if not installed).
3. Install VS Code from [code.visualstudio.com](https://code.visualstudio.com/).

Recommended versions:

- Node.js: LTS (20.x or 22.x)
- npm: comes with Node.js

## Required VS Code Extensions

- ESLint
- Prisma
- Tailwind CSS IntelliSense
- Prettier - Code formatter

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/your-org/NeoFinance.git
```

2. Enter the project folder:

```bash
cd Financial-Tracker-and-Analysis
```

3. Install dependencies:

```bash
npm install
```

4. Create environment file:

```bash
copy .env.example .env
```

5. Generate Prisma client:

```bash
npm run db:generate
```

6. Create/update local database schema:

```bash
npm run db:push
```

7. Seed demo data (recommended for first run):

```bash
npm run db:seed
```

8. Start development server:

```bash
npm run dev
```

9. Open:

- App: [http://localhost:3000](http://localhost:3000)

## Prisma Studio (Database UI)

Use Prisma Studio to inspect and edit data locally.

1. Make sure `.env` exists and contains:

```env
DATABASE_URL="file:./dev.db"
```

2. Run:

```bash
npm run db:studio
```

3. Prisma Studio will open in your browser.

If your browser does not auto-open, check the terminal output and open the shown local URL manually.

## Available Scripts

- `npm run dev` - Start local development server
- `npm run build` - Create production build
- `npm run start` - Run production server
- `npm run lint` - Run ESLint checks
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push Prisma schema to database
- `npm run db:migrate` - Run Prisma migrate in dev mode
- `npm run db:seed` - Seed demo records
- `npm run db:studio` - Open Prisma Studio

## Common Setup Issues

### `Environment variable not found: DATABASE_URL`

Fix:

1. Ensure `.env` exists in the project root.
2. Ensure this exact line is present:

```env
DATABASE_URL="file:./dev.db"
```

3. Re-run:

```bash
npm run db:generate
npm run db:push
```

### Prisma Studio shows missing tables

Fix:

```bash
npm run db:push
npm run db:seed
```

### Slow first compile in `npm run dev`

The first compile is usually slower because dependencies and routes are compiled on demand. Subsequent reloads are normally much faster.

## License

This project is licensed under the terms in [LICENSE](./LICENSE).
