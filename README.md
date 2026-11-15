# InterviewPrep

InterviewPrep is a full-stack university project for structured interview preparation. It combines guided practice questions, self-assessment, timed mock interviews, server-calculated scores, and personal progress tracking in a responsive React application.

## Main features

- Account registration, login, logout, and JWT-protected pages
- Email-based forgot/reset password flow when SMTP is configured
- Practice questions in Technical, Behavioral, and General categories
- Suggested answers and self-assessment statuses
- Complete CRUD for each user's question progress: create, read, update, and reset/delete
- Five-question mock interviews with random questions and a five-minute timer
- Server-authoritative deadlines, scoring, result persistence, and duplicate-submission protection
- Dashboard statistics, interview history, questions to review, and progress charts
- User profile plus persistent light and dark themes
- Responsive sidebar navigation

## Technologies

### Client

- React 19 and Vite 8
- JavaScript and CSS
- Vitest, React Testing Library, jest-dom, and jsdom
- Oxlint

### Server

- Node.js and Express 5
- MongoDB and Mongoose
- bcrypt and JSON Web Tokens
- Helmet, CORS, and express-rate-limit
- Nodemailer
- Vitest, Supertest, and mongodb-memory-server

## Project structure

```text
InterviewPrep/
├── client/                 React/Vite application
│   ├── public/             Static public files
│   └── src/
│       ├── api/            Shared apiFetch helper
│       ├── components/     Reusable UI components
│       ├── pages/          Screens and component tests
│       └── test/           Frontend test setup
├── server/                 Express/Mongoose API
│   ├── middleware/         JWT authentication middleware
│   ├── models/             Mongoose schemas
│   ├── routes/             Authentication, questions, and interviews
│   ├── scripts/            Question seed scripts
│   ├── tests/              Integration and configuration tests
│   └── utils/              Password-reset email helper
└── docs/                   Schema and wireframe documentation
```

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- npm
- A running MongoDB instance

## Installation and local startup

### 1. Server

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env`. At minimum, configure `MONGODB_URI` and replace the example `JWT_SECRET` with a cryptographically random secret containing at least 32 characters.

Seed the question collections, then start the development server:

```bash
npm run seed:questions
npm run seed:mock-questions
npm run dev
```

The example configuration starts the API on `http://localhost:5000`.

### 2. Client

Open another terminal:

```bash
cd client
npm install
```

Create `client/.env` with the API base URL matching the server port:

```env
VITE_API_URL=http://localhost:5000
```

Start Vite:

```bash
npm run dev
```

The default Vite origin is `http://localhost:5173`, matching `CLIENT_ORIGIN` in the server example.

## Environment variables

Copy [server/.env.example](server/.env.example) to `server/.env`. Real `.env` files are ignored by Git.

| Variable | Purpose |
| --- | --- |
| `PORT` | Express server port |
| `MONGODB_URI` | MongoDB connection string; required at startup |
| `JWT_SECRET` | JWT signing secret; required, at least 32 characters, and not a placeholder |
| `CLIENT_ORIGIN` | Single browser origin allowed by CORS; defaults to `http://localhost:5173` |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port |
| `SMTP_SECURE` | Use a secure SMTP connection when `true` |
| `SMTP_USER` | SMTP account username |
| `SMTP_PASS` | SMTP account password |
| `SMTP_FROM` | Sender displayed on reset emails |
| `FRONTEND_URL` | Base URL used to create password-reset links |

The SMTP settings and `FRONTEND_URL` are required only for password-reset email delivery. Without them, the forgot-password endpoint reports that email delivery is unavailable.

## npm scripts

### Client (`client/`)

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `client/dist` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run Oxlint |
| `npm test` | Run frontend Vitest tests once |

### Server (`server/`)

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Express with Nodemon |
| `npm start` | Start Express with Node |
| `npm test` | Run backend Vitest tests once |
| `npm run seed:questions` | Insert missing practice questions |
| `npm run seed:mock-questions` | Insert missing mock-interview questions |

## Authentication and security

- Passwords are stored in `password_hash` after bcrypt hashing with 10 salt rounds.
- Login returns a JWT that expires after one hour. The client sends it as a Bearer token through `apiFetch()`.
- `requireAuth` protects private question, interview, progress, statistics, and profile endpoints.
- Private database queries include the authenticated user ID to enforce ownership.
- Login and signup each allow 10 requests per IP per 15 minutes. Password-reset endpoints have a separate limiter.
- Helmet adds HTTP security headers, and CORS permits only `CLIENT_ORIGIN`.
- Startup validation rejects missing database/JWT configuration and weak or placeholder JWT secrets.
- Password-reset tokens are random, stored as SHA-256 hashes, expire after 15 minutes, and are removed after use.
- Backend integration tests use mongodb-memory-server and explicitly refuse the configured development database.

## Main API endpoints

Protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | API health check |
| `POST` | `/api/auth/signup` | No | Create an account |
| `POST` | `/api/auth/login` | No | Authenticate and receive a JWT |
| `POST` | `/api/auth/forgot-password` | No | Request reset instructions |
| `POST` | `/api/auth/reset-password` | No | Set a password using a reset token |
| `GET` | `/api/auth/me` | Yes | Load the authenticated profile |
| `GET` | `/api/questions?category=...` | Yes | List practice questions |
| `GET` | `/api/questions/progress` | Yes | Read saved question progress |
| `GET` | `/api/questions/review` | Yes | Read questions marked for review |
| `PUT` | `/api/questions/:id/progress` | Yes | Create or update question progress |
| `DELETE` | `/api/questions/:id/progress` | Yes | Delete/reset question progress |
| `POST` | `/api/interviews/start` | Yes | Create a timed random interview session |
| `POST` | `/api/interviews/submit` | Yes | Submit answers and receive the server-calculated result |
| `GET` | `/api/interviews/results` | Yes | List persisted interview results |
| `GET` | `/api/interviews/stats` | Yes | Load dashboard/progress statistics |

## Testing

Backend tests run against isolated in-memory MongoDB and never use the normal development database:

```bash
cd server
npm test
```

Frontend tests mock API requests and do not contact Express or MongoDB:

```bash
cd client
npm test
npm run lint
npm run build
```

The backend suite covers authentication, validation, rate limiting, CORS, ownership, QuestionProgress deletion, mock-interview timing/scoring, duplicate submissions, and environment validation. The frontend suite covers Login behavior and Practice progress reset.

## Additional documentation

- [Database schema](docs/database-schema.md)
- [Wireframes and navigation flow](docs/wireframes.md)
