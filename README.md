# NeoFinance

NeoFinance is an intelligent personal finance tracking and analysis system designed to help users build better financial habits through consistent daily use, clear visual feedback, and AI-assisted guidance.

Unlike basic expense trackers, NeoFinance combines account security, transaction management, receipt digitization, AI categorization, cashflow forecasting, daily target control, recurring transaction automation, and multilingual UX in one platform.

## Demo and Report

- YouTube Link: [TBD]()
- Report Link: [TBD]()

## Core Features

- Secure authentication (`register`, `login`, `logout`) with session-based access.
- Dashboard with expense/income overview, dynamic balance ring, savings, and daily target progress.
- Transaction module with add/edit/delete, icon-based category selection, and custom categories.
- AI-assisted category handling and receipt interpretation (Gemini API integration).
- Receipt scan workflow and receipt gallery storage.
- Calendar view with month navigation and day-level transaction markers.
- Recurring transactions (e.g., salary, rent, utilities) with pause/resume/delete controls.
- Report module (expense/income) with 1-month, 6-month, and 1-year analysis ranges.
- AI cashflow forecast (7-day and 30-day outlook) and report-level AI guidance.
- Notification center (read/delete/select-delete/all-delete workflows).
- Streak module for daily recording consistency.
- Full multilingual support: English (`en`), Chinese (`zh`), Bahasa Melayu (`ms`).

## Tech Stack

- Frontend: Next.js (App Router) + React
- Backend: Next.js Route Handlers
- Language: JavaScript
- ORM: Prisma
- Database (local): SQLite
- Styling: Tailwind CSS v4
- AI: Gemini API

## Prerequisites

- Node.js LTS (recommended: Node 20+)
- npm (bundled with Node.js)
- Git
- VS Code (recommended)

## Recommended VS Code Extensions

- ESLint
- Prisma
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- ES7+ React/Redux/React-Native snippets
- Auto Rename Tag

## Quick Start

### 1. Install Node.js

Download and install Node.js LTS from [https://nodejs.org](https://nodejs.org).

Verify:

```bash
node -v
npm -v
```

### 2. Clone the repository

```bash
git clone https://github.com/<your-username>/NeoFinance.git
cd NeoFinance
```

### 3. Install dependencies

```bash
npm install
```

### 4. Create environment file

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY=
```

Notes:

- `DATABASE_URL` is required.
- `GEMINI_API_KEY` is required for AI features (receipt AI, categorization assistance, forecast summary, personality responses).

### 5. Setup database

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 6. Start development server

```bash
npm run dev
```

Open:

- [http://localhost:3000](http://localhost:3000)

### 7. (Optional) Use local custom host `neofinance.local`

1. Edit `C:\Windows\System32\drivers\etc\hosts` as Administrator and add:

```txt
127.0.0.1 neofinance.local
```

2. Flush DNS:

```powershell
ipconfig /flushdns
```

3. Restart dev server, then open:

- [http://neofinance.local:3000](http://neofinance.local:3000)

### 8. Open Prisma Studio

```bash
npm run db:studio
```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Next.js dev server |
| `npm run dev:webpack` | Start dev server with webpack mode |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run clean` | Remove `.next` cache |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run Prisma migration (dev) |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## Common Setup Issues

### `Environment variable not found: DATABASE_URL`

Fix:

1. Ensure `.env` exists in project root.
2. Ensure this exact line exists:

```env
DATABASE_URL="file:./dev.db"
```

3. Run:

```bash
npm run db:generate
npm run db:push
```

### Prisma table missing errors (e.g., `main.Session` does not exist)

Fix:

```bash
npm run db:push
npm run db:seed
```

### First compile is slow

The first `npm run dev` compile is usually slower due to route compilation and cache warm-up. Subsequent runs are much faster.

## AI Integration Notes

NeoFinance integrates Gemini API for:

- Receipt text interpretation and structured extraction.
- Category intelligence support.
- Personality-based finance responses.
- Cashflow forecast summary generation.

All final product logic, design decisions, and validations remain controlled by the development team.

## Internationalization

NeoFinance supports:

- English (`en`)
- Chinese (`zh`)
- Bahasa Melayu (`ms`)

Language selection is available in the menu and persisted for the full app experience.

## Project Structure (High-Level)

```text
Financial-Tracker-and-Analysis/
├─ prisma/                  # Prisma schema, local DB, seed script
├─ public/                  # Static assets and app icon
├─ src/
│  ├─ app/                  # App Router pages + API route handlers
│  ├─ components/           # Shared UI components
│  ├─ features/             # Feature modules (auth, dashboard, scan, etc.)
│  ├─ hooks/                # Client hooks
│  ├─ lib/                  # Business logic, auth/session, i18n, utilities
│  ├─ services/             # API client/service wrappers
│  └─ utils/                # Generic helpers
├─ middleware.js            # Route protection middleware
├─ next.config.mjs          # Next.js config
└─ package.json             # Scripts and dependencies
```


## License

This project is licensed under [LICENSE](./LICENSE).
