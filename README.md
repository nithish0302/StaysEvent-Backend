# StayEvents — Backend

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![Jest](https://img.shields.io/badge/Tested_with-Jest-C21325?logo=jest&logoColor=white)
![CI](https://img.shields.io/github/actions/workflow/status/nithish0302/StaysEvent-Backend/backend-ci.yml?branch=main&label=CI)
[![Live Demo](https://img.shields.io/badge/Live_Demo-stayevents.vercel.app-000000?logo=vercel&logoColor=white)](https://stayevents.vercel.app/)

REST API for **StayEvents**, a full-stack hotel & event booking platform. Handles authentication (JWT + Google OAuth), role-based access for customers/vendors/admins, hotel & event listings, bookings, Razorpay payments, reviews, and admin moderation.

**Live demo:** [stayevents.vercel.app](https://stayevents.vercel.app/)
**Frontend repo:** [StaysEvent-Frontend](https://github.com/nithish0302/StaysEvent-Frontend)

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [Testing](#testing)
- [Project structure](#project-structure)
- [API overview](#api-overview)
- [Security](#security)
- [Author](#author)

## Features

- JWT access + refresh token auth, with Google OAuth 2.0 as an alternate login path
- Role-based access control for customer / vendor / admin, enforced at the middleware layer
- Vendor onboarding with KYC (ID proof + business document) approval workflow
- Hotel & event listings with full CRUD, ownership checks, and location validation
- Booking engine with room/seat reservation, status transitions, and a review-prompt flow
- Razorpay payment order creation + signature verification
- Review system with duplicate-booking guards and vendor replies
- Admin dashboard endpoints: vendor approval, platform stats, featured-listing toggle
- Unified search across hotels and events by name/city
- Centralized error handling that normalizes Mongoose/JWT errors into consistent JSON

## Tech stack

| Layer | Choice |
|---|---|
| Runtime / framework | Node.js, Express 5 |
| Database | MongoDB, Mongoose |
| Auth | JSON Web Tokens, Passport (Google OAuth 2.0) |
| Validation | Zod |
| Payments | Razorpay |
| Email | Nodemailer |
| Realtime | Socket.IO |
| Testing | Jest, Supertest, mongodb-memory-server |
| Security | Helmet, express-rate-limit |

## Getting started

```bash
git clone https://github.com/nithish0302/StaysEvent-Backend.git
cd StaysEvent-Backend
npm install
cp .env.example .env   # fill in real values
npm run dev
```

The server starts on `http://localhost:5000`. `GET /` returns `{"message":"Server is running"}` as a basic health check.

## Environment variables

Full list with explanations lives in [`.env.example`](./.env.example). Only `MONGODB_URI`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` are required to run the server at all — Google OAuth, email, and Razorpay are optional and degrade gracefully if left unset.

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | ✅ | Token signing secrets |
| `CLIENT_URL` | ✅ | Frontend origin, for CORS + OAuth redirect |
| `PORT` | – | Defaults to `5000` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | – | Google OAuth login |
| `MAIL_USER` / `MAIL_PASS` | – | Booking confirmation emails |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | – | Payment processing |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | – | Used only by `createAdmin.js` |

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server with nodemon |
| `npm start` | Start the server (production) |
| `npm test` | Run the Jest test suite |
| `npm run seed` | Seed demo accounts, hotels & events |
| `node createAdmin.js` | Create/promote a real admin account |

## Testing

```bash
npm test
```

Jest + Supertest against an in-memory MongoDB (`mongodb-memory-server`) — no real database is touched. Coverage includes auth (register/login/me, role-promotion edge cases), hotel & event CRUD with role and location validation, the full booking lifecycle (reservation, status transitions, review prompts), reviews (duplicate blocking, vendor replies), admin operations (stats, vendor approval, featured toggle), and unified search.

## Project structure

```
backend/
├── config/         # DB connection, Passport/Google OAuth strategy
├── controllers/     # Route handlers
├── middleware/       # JWT auth, role guard, Zod validation, error handler
├── models/          # Mongoose schemas — User, Hotel, Event, Booking, Review
├── routes/          # Express routers
├── scripts/          # Demo data seeder, E2E admin bootstrap
├── tests/            # Jest + Supertest suite
├── utils/            # Email templates/sending
├── app.js           # Express app + middleware wiring
└── server.js          # HTTP server + Socket.IO entry point
```

## API overview

| Route | Purpose |
|---|---|
| `/api/auth` | Register, login, refresh, logout, profile, Google OAuth |
| `/api/hotels`, `/api/events` | Public listings + vendor-owned CRUD |
| `/api/bookings` | Booking flow, vendor booking management, review-prompt flow |
| `/api/payments` | Razorpay order creation + verification |
| `/api/reviews` | Review CRUD, vendor replies, admin moderation |
| `/api/admin` | Vendor approval, stats, featured listings |
| `/api/search` | Unified hotel + event search |

## Security

- Helmet for HTTP security headers, `trust proxy` enabled for correct behavior behind a reverse proxy
- Tiered rate limiting — a general API limiter and a stricter one on auth endpoints
- httpOnly refresh-token cookie, `secure`/`sameSite: none` in production
- Role-based route guards on every write/admin endpoint

## Author

**Nithish** — [GitHub](https://github.com/nithish0302)
