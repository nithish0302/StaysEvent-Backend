# StayEvents — Backend

Node.js / Express 5 / MongoDB (Mongoose) API powering the StayEvents hotel & event booking platform.

## Setup

```bash
cd backend
npm install
```

Create a `.env` file (see `.env` keys used below) with at least:

```
MONGODB_URI=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CLIENT_URL=http://localhost:5173
PORT=5000

# Optional — payments (gracefully disabled if unset)
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# Optional — booking confirmation emails (gracefully disabled if unset)
MAIL_USER=...
MAIL_PASS=...

# Optional — Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Optional — Cloudinary uploads
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Run the dev server:

```bash
npm run dev
```

Seed demo data (admin/vendor/customer accounts + sample hotels & events, all under `@stayevents-demo.test` emails so it never touches real data):

```bash
npm run seed
```

## Tests

Automated backend test suite (Jest + Supertest + an in-memory MongoDB via `mongodb-memory-server` — no real database is touched):

```bash
npm test
```

The first run downloads a local MongoDB binary for `mongodb-memory-server`, which needs outbound internet access once; after that it's cached.

Coverage: auth (register/login/me), hotel CRUD + role checks, booking creation + room reservation + status transitions + review-prompt flow, review creation + duplicate blocking + vendor replies, admin stats/vendor-approval/featured-toggle, and the unified search endpoint.

## Architecture

- `models/` — Mongoose schemas (User, Hotel, Event, Booking, Review)
- `controllers/` — route handlers
- `routes/` — Express routers, mounted in `app.js`
- `middleware/` — auth (JWT), role guard, centralized error handler (`errorMiddleware.js`), Zod request validation
- `utils/mailer.js` — booking confirmation emails (Nodemailer, no-ops silently if `MAIL_USER`/`MAIL_PASS` are unset)
- `scripts/seed.js` — demo data seeder

## Security

- `helmet` for HTTP security headers
- `express-rate-limit` — general API limiter (500 req / 15 min) plus a tighter auth-endpoint limiter (30 req / 15 min)
- JWT access + refresh tokens, role-based route guards
- Centralized error handler normalizes Mongoose/JWT errors into consistent JSON responses

## API surface (high level)

- `/api/auth` — register, login, refresh, logout, profile, Google OAuth
- `/api/hotels`, `/api/events` — public listing + vendor-owned CRUD
- `/api/bookings` — customer booking flow, vendor booking management, new-booking badge, review-prompt flow
- `/api/payments` — Razorpay order creation + verification
- `/api/reviews` — review CRUD, vendor replies, admin moderation
- `/api/admin` — vendor approval, stats, featured-listing toggle, all-bookings view
- `/api/search` — unified hotel + event search by name/city
