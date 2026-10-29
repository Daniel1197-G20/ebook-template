# Premium Digital eBook & Bookstore Platform — Commercial Template

A production-ready digital publishing and eBook marketplace template designed for independent authors, boutique publishers, and digital content creators. Built with high editorial aesthetics, comprehensive commerce integration (Paystack), role-based customer & admin portals, and an in-browser reading canvas.

---

## 📑 Table of Contents

1. [Features & Architecture](#features--architecture)
2. [Project Navigation & Structure](#project-navigation--structure)
3. [Client Prerequisites](#client-prerequisites)
4. [Step-by-Step Setup Guide](#step-by-step-setup-guide)
   - [Backend Configuration](#1-backend-configuration)
   - [Database Initialization](#2-database-initialization)
   - [Frontend Configuration](#3-frontend-configuration)
5. [Running the Application](#running-the-application)
6. [Default Accounts & Credentials](#default-accounts--credentials)
7. [App Operation & User Workflows](#app-operation--user-workflows)
   - [Storefront & Discovery](#storefront--discovery)
   - [Shopping Cart & Checkout Flow](#shopping-cart--checkout-flow)
   - [Personal Library & Web Reader](#personal-library--web-reader)
   - [Admin Portal & Management](#admin-portal--management)
8. [Configuration & Environment Variables](#configuration--environment-variables)
9. [Production Deployment Checklist](#production-deployment-checklist)
10. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## 🚀 Features & Architecture

### Frontend (Client)
- **Framework:** React 19 + TypeScript + Vite
- **Routing:** React Router DOM (v7)
- **State Management & Fetching:** TanStack Query v5 + Context API
- **Design & UI:** Bespoke editorial design system, typography tokens (Newsreader serif + Plus Jakarta Sans), dark/light theme switching, and Framer Motion micro-interactions
- **In-Browser Reader:** Canvas & PDF.js-powered digital reading experience with customizable theme (Parchment, Sepia, Night) and reading progress persistence

### Backend (Server)
- **Runtime:** Node.js + Express
- **ORM & Database:** Prisma ORM with SQLite (ready out of the box) or PostgreSQL
- **Security & Auth:** JWT tokens with HTTP-only cookies, bcrypt password hashing, input sanitization via Zod, rate limiting, and Helmet protection
- **Commerce:** Native Paystack payment gateway (initialize -> verify -> automatic digital entitlement)
- **File Management:** Secure local file storage (uploads restricted to verified purchasers) with optional Firebase Cloud Storage integration

---

## 🗂 Project Navigation & Structure

```text
ebook-platform/
├── client/                     # Frontend Single Page Application (SPA)
│   ├── public/                 # Static public assets (favicons, SVG icons)
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── admin/          # Admin modals, book editors, bulk import UI
│   │   │   ├── auth/           # Protected routes & role gates (AdminRoute)
│   │   │   ├── books/          # Book cards, book filters, detail views
│   │   │   ├── common/         # Buttons, inputs, dropdowns, toasts
│   │   │   ├── gallery/        # Editorial showcase, book 3D carousels
│   │   │   └── layout/         # Header, Navbar, Footer, Navigation
│   │   ├── context/            # AuthContext, CartContext, ToastContext
│   │   ├── pages/              # Primary route pages
│   │   │   ├── admin/          # Admin dashboard & management interfaces
│   │   │   ├── HomePage.tsx    # Curated editorial storefront
│   │   │   ├── BooksPage.tsx   # Catalog search, filtering, and sort
│   │   │   ├── BookDetailPage.tsx # Book details, sample reading & buy actions
│   │   │   ├── CartPage.tsx    # Cart review & promo codes
│   │   │   ├── LibraryPage.tsx # Authenticated user's purchased books
│   │   │   ├── ReaderPage.tsx  # In-browser distraction-free eBook reader
│   │   │   └── AuthPages...    # Login, Register, Forgot/Reset Password
│   │   ├── services/           # Axios API client (`api.ts`)
│   │   ├── styles/             # Design tokens, variables, typography, layouts
│   │   └── types/              # TypeScript interfaces and data models
│   ├── .env.example            # Client environment blueprint
│   ├── package.json            # Frontend dependencies and scripts
│   └── vite.config.ts          # Vite bundler config
│
├── server/                     # Backend API Server
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (User, Book, Order, Purchase, etc.)
│   │   └── seed.js             # Initial database seed script (Admin + Sample Books)
│   ├── src/
│   │   ├── config/             # Config loaders (env variables, Firebase)
│   │   ├── controllers/        # Express route controllers (Auth, Books, Admin, etc.)
│   │   ├── middleware/         # Auth verification, role checks, multer uploads
│   │   ├── routes/             # API routes definition (/auth, /books, /admin, /payments)
│   │   ├── services/           # Business logic & payment handling (Paystack)
│   │   ├── validators/         # Zod schemas for request validation
│   │   ├── app.js              # Express application configuration
│   │   └── server.js           # HTTP server bootstrap entry point
│   ├── uploads/                # Protected local storage directory for covers & files
│   │   ├── covers/             # Book cover art
│   │   ├── ebooks/             # Secure eBook files (EPUB/PDF)
│   │   └── previews/           # Free sample excerpts
│   ├── .env.example            # Server environment blueprint
│   └── package.json            # Backend dependencies and scripts
│
├── .gitignore                  # Git ignore rules (protecting secrets and uploads)
└── README.md                   # Complete template guide & documentation
```

---

## 📋 Client Prerequisites

Before launching the project, verify that the following are installed on your machine:
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm** (bundled with Node.js) or **yarn** / **pnpm**
- **Git**

*(Optional)* A free [Paystack Developer Account](https://dashboard.paystack.com/#/signup) to test real payment transactions using test credentials.

---

## 🛠 Step-by-Step Setup Guide

### 1. Backend Configuration

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```

2. Copy the sample environment file:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` and configure your settings:
   ```ini
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173

   # Database (defaults to SQLite dev.db file for instant zero-config setup)
   DATABASE_URL="file:./dev.db"

   # Replace with 32+ character random strings for security
   JWT_SECRET=your_jwt_secret_min_32_chars_replace_in_production
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars_replace_in_production

   # Add your Paystack test keys (from your Paystack dashboard)
   PAYSTACK_SECRET_KEY=<your_paystack_test_secret_key>
   PAYSTACK_PUBLIC_KEY=<your_paystack_test_public_key>
   ```

4. Install backend dependencies:
   ```bash
   npm install
   ```

---

### 2. Database Initialization

The template uses Prisma ORM. By default, it is configured with an embedded SQLite database (`server/prisma/dev.db`), meaning you don't need to configure a local PostgreSQL server to start developing immediately.

1. Generate Prisma client & sync database tables:
   ```bash
   npm run db:generate
   npm run db:push
   ```

2. Seed the database with sample categories, featured books, and initial accounts:
   ```bash
   npm run db:seed
   ```

*(Optional)* To inspect the database visually in your browser at any time, run:
```bash
npm run db:studio
```

---

### 3. Frontend Configuration

1. Open a new terminal and navigate to the `client` directory:
   ```bash
   cd client
   ```

2. Copy the sample client environment file:
   ```bash
   cp .env.example .env
   ```
   *(By default, `VITE_API_URL=http://localhost:5000/api`, which matches the server configuration).*

3. Install frontend dependencies:
   ```bash
   npm install
   ```

---

## 💻 Running the Application

### Start the Backend Server:
From the `server` directory:
```bash
npm run dev
```
> The API will start on: **`http://localhost:5000`**

### Start the Frontend Application:
From the `client` directory:
```bash
npm run dev
```
> The web application will start on: **`http://localhost:5173`**

Open `http://localhost:5173` in your web browser.

---

## 🔑 Default Accounts & Credentials

The seed script (`npm run db:seed`) creates default test accounts:

| Role | Email | Default Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@ebookplatform.com` | `Admin123!` | Access to `/admin`, catalog CRUD, user role management, bulk imports, sales analytics |
| **Customer / Reader** | `reader@example.com` | `Customer123!` | Browse, add to cart, checkout, view purchased library, launch web reader |

> ⚠️ **Important:** Change these passwords immediately before using in a production environment.

---

## 🧭 App Operation & User Workflows

### Storefront & Discovery
- **Homepage (`/`)**: Displays the author's hero showcase, featured releases, curated quotes, and dynamic presentation modes (tactile cover flow, editorial grid, and shelf view).
- **Catalog (`/books`)**: Full book listing with live title/author search, category filtration, price sorting, and instant preview modal.
- **Book Details (`/books/:slug`)**: Comprehensive metadata, synopsis, format specifications, reader reviews, and instant purchase / add-to-cart actions.

### Shopping Cart & Checkout Flow
1. Users can add one or multiple books to their cart (`/cart`).
2. Duplicate detection prevents purchasing titles already owned in the customer's library.
3. Promo vouchers (e.g., `READ20`) can be applied during review.
4. On clicking **Proceed to Checkout**, the backend initializes a Paystack transaction session and redirects to Paystack's payment interface.
5. Upon completion, Paystack redirects back to `/payment/callback`, verifying the transaction server-side and automatically adding the purchased titles to the user's library.

### Personal Library & Web Reader
- **User Library (`/dashboard/library`)**: Displays all owned titles. Allows one-click downloads (DRM-free PDF/EPUB) or opening the in-browser reader.
- **Web Reader (`/reader/:bookId`)**: High-comfort reading canvas featuring:
  - Theme switching (Parchment, Sepia, Midnight Dark)
  - Typography scale adjustment (font size, line height, font family)
  - Automatic progress saving so readers can resume where they left off

### Admin Portal & Management
- Access the Admin Portal by signing in with an Admin account and navigating to `/admin`.
- **Dashboard & Stats**: Real-time overview of revenue, total orders, book catalog size, and customer base.
- **Book Management**: Add new books, upload cover art and eBook assets, edit pricing, or toggle visibility.
- **Bulk Entry & Discovery**: Import multiple titles simultaneously or discover external book metadata via integrated external explorers.
- **User Management**: Inspect registered users and elevate accounts to administrator privileges.

---

## ⚙️ Configuration & Environment Variables

### Server (`server/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Port for Express server | `5000` |
| `NODE_ENV` | Environment mode | `development` / `production` |
| `FRONTEND_URL` | Allowed origin for CORS & cookie credentials | `http://localhost:5173` |
| `DATABASE_URL` | SQLite file connection or PostgreSQL connection string | `file:./dev.db` |
| `JWT_SECRET` | Secret key for signing access tokens | *(Generate 32+ character random string)* |
| `JWT_EXPIRES_IN` | Access token lifespan | `15m` |
| `JWT_REFRESH_SECRET`| Secret key for refresh tokens | *(Generate 32+ character random string)* |
| `JWT_REFRESH_EXPIRES_IN`| Refresh token lifespan | `7d` |
| `PAYSTACK_SECRET_KEY` | Paystack private key for payment initialization & verification | Your Paystack test or live secret key |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | Your Paystack test or live public key |
| `UPLOAD_DIR` | Local directory for uploaded assets | `uploads` |
| `MAX_FILE_SIZE` | Maximum file upload size in bytes | `52428800` (50MB) |

### Client (`client/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend API base endpoint | `http://localhost:5000/api` |

---

## 🛡 Security & Best Practices

- **Zero Hardcoded Secrets**: No secret keys, database credentials, or API tokens are stored in the codebase.
- **File Access Security**: eBook binary files (`/server/uploads/ebooks`) are strictly gated by backend authorization; only authenticated users with verified purchase records can stream or download files.
- **Input Validation**: All client requests are strictly parsed using Zod schemas on the backend before hitting database queries.
- **Payment Verification**: Client-reported payment amounts are never trusted. The server verifies transactions directly with Paystack's API before issuing entitlements.

---

## 🚢 Production Deployment Checklist

When deploying this template for commercial or client use:

1. **Database:**
   - Update `datasource db` in `server/prisma/schema.prisma` to `provider = "postgresql"` if connecting to a managed PostgreSQL cluster (Supabase, Neon, AWS RDS, Railway, etc.).
   - Set `DATABASE_URL` in `server/.env` to your production database URL.
   - Run `npx prisma migrate deploy` or `npx prisma db push`.

2. **Environment Variables:**
   - Generate secure 64-character random strings for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
   - Replace Paystack test keys with your live production keys (available in your Paystack dashboard under Settings → API Keys).
   - Update `FRONTEND_URL` on the server and `VITE_API_URL` on the client to your live domain (e.g. `https://yourdomain.com`).

3. **Build Frontend:**
   ```bash
   cd client
   npm run build
   ```
   Deploy the `client/dist` directory to your static hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

4. **Deploy Backend:**
   Run with a process manager like PM2 or deploy via Docker to your cloud provider (Render, Railway, DigitalOcean, Heroku):
   ```bash
   cd server
   npm run start
   ```

---

## ❓ Troubleshooting & FAQ

**Q: Why do I get a database error when starting?**  
A: Ensure you have executed `npx prisma db push` inside the `server/` directory to create the initial tables in `dev.db`.

**Q: Can I use PostgreSQL instead of SQLite?**  
A: Yes! Open `server/prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`, set your PostgreSQL URL in `server/.env`, and run `npx prisma db push`.

**Q: Where are uploaded book covers and PDF files stored?**  
A: By default, they are stored securely in `server/uploads/`. Access to eBook downloads is protected behind authentication and purchase verification endpoints.
