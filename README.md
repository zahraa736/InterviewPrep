# InterviewPrep

InterviewPrep is a full-stack university project for structured interview preparation. It combines guided practice questions, self-assessment, timed mock interviews, server-calculated scores, and personal progress tracking in a responsive React application.

## Live Demo

- Frontend: https://interview-prep-sigma-jet.vercel.app
- Backend API: https://interviewprep-8ggh.onrender.com
- GitHub Repository: https://github.com/zahraa736/InterviewPrep

The frontend is deployed on Vercel, the backend on Render, and the database is hosted on MongoDB Atlas.

## Main Features

- Account registration, login, logout, and JWT-protected pages
- Email-based forgot/reset password functionality using the Brevo transactional email API
- Practice questions in Technical, Behavioral, and General categories
- Suggested answers and self-assessment statuses
- Complete CRUD for each user's question progress: create, read, update, and reset/delete
- Five-question mock interviews with random questions and a five-minute timer
- Server-authoritative deadlines, scoring, result persistence, and duplicate-submission protection
- Dashboard statistics, interview history, questions to review, and progress charts
- User profile with persistent light and dark themes
- Responsive sidebar navigation

## Technologies

### Frontend

- React 19
- Vite 8
- JavaScript and CSS
- React Router
- Vitest
- React Testing Library
- jest-dom
- jsdom
- Oxlint

### Backend

- Node.js
- Express 5
- MongoDB Atlas
- Mongoose
- bcrypt
- JSON Web Tokens (JWT)
- Helmet
- CORS
- express-rate-limit
- Brevo Transactional Email API
- Vitest
- Supertest
- mongodb-memory-server

### Deployment

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas
- Email Service: Brevo

## Project Structure

```text
InterviewPrep/
├── client/                 React/Vite application
│   ├── public/             Static public files
│   └── src/
│       ├── api/            Shared API helper
│       ├── components/     Reusable UI components
│       ├── pages/          Application pages and tests
│       └── test/           Frontend test setup
├── server/                 Express/Mongoose API
│   ├── middleware/         JWT authentication middleware
│   ├── models/             MongoDB/Mongoose schemas
│   ├── routes/             Authentication, questions, and interviews
│   ├── scripts/            Question seed scripts
│   ├── tests/              Backend automated tests
│   └── utils/              Password-reset email helper
├── docs/                   Schema and wireframe documentation
└── README.md               Project documentation
```

## Prerequisites

- Node.js 22.12.0 or newer (recommended for frontend testing)
- npm
- MongoDB or MongoDB Atlas

## Installation and Local Startup

### 1. Backend

Open a terminal:

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env` and configure the required environment variables.

At minimum, provide:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_ORIGIN`

The JWT secret should be a cryptographically random string containing at least 32 characters.

Seed the question collections:

```bash
npm run seed:questions
npm run seed:mock-questions
```

Start the backend:

```bash
npm run dev
```

The default backend address is:

```text
http://localhost:5000
```

### 2. Frontend

Open another terminal:

```bash
cd client
npm install
```

Create a file named `.env` inside `client`:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

The default frontend address is:

```text
http://localhost:5173
```

## Environment Variables

Create `server/.env` using `server/.env.example` as a starting point.

| Variable | Purpose |
| --- | --- |
| `PORT` | Express server port |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `CLIENT_ORIGIN` | Allowed frontend origin for CORS |
| `FRONTEND_URL` | Frontend URL used in password-reset links |
| `BREVO_API_KEY` | Brevo API key for transactional email delivery |
| `BREVO_SENDER_EMAIL` | Verified sender email address, if configured by the email helper |
| `SMTP_HOST` | SMTP hostname for optional SMTP configuration |
| `SMTP_PORT` | SMTP port |
| `SMTP_SECURE` | Whether SMTP uses a secure connection |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | SMTP sender address |

**Important:** Never commit real API keys, passwords, JWT secrets, or database credentials to GitHub.

The deployed application uses Brevo's HTTPS transactional email API for password-reset emails.

## Authentication and Security

InterviewPrep includes authentication and security protections:

- Passwords are hashed using bcrypt.
- Login returns a JWT that expires after one hour.
- Protected routes require a valid JWT.
- Private database queries enforce user ownership.
- Login and registration requests are rate-limited.
- Password-reset requests have separate rate limiting.
- Helmet adds HTTP security headers.
- CORS restricts browser access to the configured frontend origin.
- Password-reset tokens are randomly generated.
- Reset tokens are stored as SHA-256 hashes.
- Password-reset links expire after 15 minutes.
- Reset tokens cannot be reused after a successful password change.

## Main API Endpoints

Protected endpoints require:

```text
Authorization: Bearer <token>
```

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | No | API health check |
| POST | `/api/auth/signup` | No | Create an account |
| POST | `/api/auth/login` | No | Authenticate a user |
| POST | `/api/auth/forgot-password` | No | Request password-reset instructions |
| POST | `/api/auth/reset-password` | No | Reset a password |
| GET | `/api/auth/me` | Yes | Retrieve authenticated user profile |
| GET | `/api/questions?category=...` | Yes | List practice questions |
| GET | `/api/questions/progress` | Yes | Retrieve question progress |
| GET | `/api/questions/review` | Yes | Retrieve questions marked for review |
| PUT | `/api/questions/:id/progress` | Yes | Create or update question progress |
| DELETE | `/api/questions/:id/progress` | Yes | Reset/delete question progress |
| POST | `/api/interviews/start` | Yes | Start a timed mock interview |
| POST | `/api/interviews/submit` | Yes | Submit interview answers |
| GET | `/api/interviews/results` | Yes | Retrieve interview results |
| GET | `/api/interviews/stats` | Yes | Retrieve dashboard statistics |

## Testing

InterviewPrep includes automated frontend and backend tests using Vitest.

### Backend Tests

Run:

```bash
cd server
npm test
```

Results:

- 2 test files passed
- 46 tests passed

Backend tests cover authentication, validation, rate limiting, CORS, user ownership, question progress, mock-interview timing and scoring, duplicate submissions, and environment validation.

Tests use an isolated in-memory MongoDB database instead of the development or production database.

### Frontend Tests

Run:

```bash
cd client
npm test
```

Results:

- 12 test files passed
- 66 tests passed

Frontend tests cover:

- Application routing
- Login
- Registration
- Forgot password
- Reset password
- Dashboard
- Practice questions
- Mock interviews
- Progress tracking
- User profile
- API client behavior
- Theme initialization

### Total Automated Test Results

| Component | Tests Passed |
| --- | ---: |
| Frontend | 66 |
| Backend | 46 |
| **Total** | **112** |

**All 112 automated tests passed during local testing.**

### Additional Checks

Run frontend linting:

```bash
cd client
npm run lint
```

Create a production build:

```bash
npm run build
```

## Deployment

### Frontend — Vercel

The React frontend is deployed on Vercel.

Production URL:

https://interview-prep-sigma-jet.vercel.app

### Backend — Render

The Express backend is deployed on Render.

Production URL:

https://interviewprep-8ggh.onrender.com

### Database — MongoDB Atlas

MongoDB Atlas provides persistent cloud database storage for users, practice progress, and interview results.

### Email — Brevo

Brevo's transactional email API sends password-reset emails.

When a user requests a password reset, the backend generates a temporary token and sends a reset link to the user's email address.

The token expires after 15 minutes and cannot be reused after a successful reset.

## Additional Documentation

- [Database Schema](docs/database-schema.md)
- [Wireframes and Navigation Flow](docs/wireframes.md)

## Project Purpose

InterviewPrep was developed as a full-stack university project to help users prepare for job interviews through structured practice, timed simulations, and progress tracking.

The application demonstrates frontend development with React, backend REST API development with Express, database integration with MongoDB, JWT authentication, third-party email API integration, automated testing, and cloud deployment.

## Milestone Summary

| Milestone | Deliverable | Git Reference | Status |
| --- | --- | --- | --- |
| Milestone 1 | Project scaffold, wireframes and database schema | `7e1a887` | Completed |
| Milestone 2 | Backend authentication and CRUD routes | `7e1a887` | Completed |
| Milestone 3 | Frontend integration and core user-facing features | `7e1a887`, `c9d09d9` | Completed |
| Milestone 4 | Public deployment and production database | `62ffade`, `c9d09d9`, `cbf9d95` | Completed |

The first three milestones were included in the initial repository commit. Subsequent commits document deployment fixes, Brevo email integration, documentation updates, and frontend testing improvements.