# FINNOVA — Personal Finance Planning App

A MERN-stack personal finance planning app with a dark, premium glassmorphism UI. Built as an academic Societal Orientation project, structured so future modules (Subscription Tracker, AI Assistant, Spending Analytics, Receipt OCR, Voice entry) can be added without refactoring.

## Tech Stack

- **Frontend:** React (Vite) + Tailwind CSS + React Router + lucide-react + axios
- **Backend:** Node.js + Express.js
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT (httpOnly cookie)

## Project Structure

```
finnova/
  client/          # React + Vite + Tailwind
  server/          # Node + Express + Mongoose
```

## Prerequisites

- Node.js v18+ (tested on v22)
- MongoDB running locally (`mongodb://127.0.0.1:27017/finnova`) or a MongoDB Atlas URI

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

Copy the example env files and fill in your values:

```bash
# Server
cp server/.env.example server/.env

# Client
cp client/.env.example client/.env
```

**server/.env**
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/finnova
JWT_SECRET=change_this_to_a_long_random_string
CLIENT_URL=http://localhost:5173
```

**client/.env**
```
VITE_API_URL=http://localhost:5000/api
```

### 3. Run the app

Run both server and client together (uses `concurrently`):

```bash
npm run dev
```

Or run them in two separate terminals:

```bash
# Terminal 1 — backend
npm run dev:server

# Terminal 2 — frontend
npm run dev:client
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

## Features (this build)

- **Auth** — Sign up (Student / Working Professional) & Login with JWT
- **Dashboard** — Income left this month, recent spending, upcoming EMIs & bills
- **Spending History** — Add expenses, browse by month
- **Bills & EMI** — Track recurring bills & EMIs, mark as paid
- **Goal Planner** — Savings goals with progress & contributions
- **Emergency Fund** — Auto-created safety net (3–6 months of income)
- **Coming Soon** — Subscription Tracker & AI Assistant placeholders

## API Summary

```
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me

GET    /api/dashboard/summary
GET    /api/expenses?month=&year=
POST   /api/expenses
GET    /api/expenses/months

GET    /api/bills-emi?type=emi|bill
POST   /api/bills-emi
PATCH  /api/bills-emi/:id/pay

GET    /api/goals
POST   /api/goals
PATCH  /api/goals/:id/contribute

GET    /api/emergency-fund
PATCH  /api/emergency-fund/contribute
PATCH  /api/emergency-fund/target
```

All routes except `/api/auth/signup` and `/api/auth/login` require JWT auth.

## Extensibility Notes

- Sidebar nav is driven by a single config array (`client/src/config/navItems.js`)
- Expense model has a `source` field (`manual | voice | ocr`) for future voice/OCR entry
- Shared axios instance in `client/src/services/api.js` with auth interceptor
- Category lists live in one shared constants file (`client/src/constants/categories.js`)
- Currency symbol is read from `user.currency` (default `₹`)