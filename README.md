# Financial Tracker and Analysis

Starter project for a personal finance tracking and analysis website built with:

- Next.js
- React
- JavaScript
- Prisma
- Tailwind CSS

## Quick Start

1. Clone repository
   
```bash
git clone https://github.com/xxx/project.git
```
2. Enter the project folder
   
```bash
cd Financial-Tracker-and-Analysis
```
3. Install dependencies:

```bash
npm install
```

4. Create your environment file:

```bash
copy .env.example .env
```

5. Generate the Prisma client:

```bash
npm run db:generate
```

6. Create the local database:

```bash
npm run db:push
```

7. Optional demo data:

```bash
npm run db:seed
```

8. Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Current Foundation

- Landing page starter
- Dashboard placeholder
- Transactions placeholder
- Prisma schema for users, accounts, categories, transactions, and budgets
- Health check API route at `/api/health`

## Next Suggested Features

1. Create transaction CRUD pages
2. Add monthly budget management
3. Build summary charts and report views
4. Add authentication

For the folder architecture and local setup notes, see `docs/project-setup.md`.
