# LLOP Polling App

LLOP is a full-stack real-time polling application. Creators sign in, build polls, share public links, collect responses, watch analytics update live, and publish final results when the poll is ready.

The project is split into two apps:

- `client/` - React + Vite frontend
- `server/` - Bun + Express API, Socket.IO server, Drizzle ORM, PostgreSQL

The current backend source of truth is PostgreSQL. REST handles creation, fetching, publishing, and response submission. Socket.IO is used only where it adds value: live creator analytics updates after responses are saved.

![Polling app planning diagram](image.png)

## What We Are Building

The goal is to build a production-shaped polling workflow with clean creator and respondent paths.

Creator flow:

1. Creator signs in with Clerk.
2. Creator builds a poll with title, description, category, tags, expiration, anonymity mode, public result settings, and one or more questions.
3. Server creates the poll, generates a unique public slug, stores questions and options, and marks the poll as active.
4. Creator shares `/p/:slug`.
5. Creator opens `/dashboard/:pollId` to watch analytics.
6. Dashboard joins a Socket.IO room for that poll.
7. When responses arrive, the server recalculates analytics and broadcasts the update.
8. Creator publishes final results when ready.

Respondent flow:

1. Respondent opens `/p/:slug`.
2. Client loads the public poll by slug.
3. Respondent submits answers through REST.
4. Server validates required questions, valid options, duplicate submissions, auth rules, and poll status.
5. Server stores the response and question responses.
6. Server emits updated analytics to the creator dashboard.
7. Respondent sees the completion message and, if enabled, live results.

Important design decision:

- Respondents do not need sockets.
- The public poll form submits through REST.
- The creator dashboard uses sockets for live analytics.
- This keeps the response path simple and avoids unnecessary open socket connections.

## Current Planning

The app is planned around these responsibilities:

- Authentication: Clerk owns user identity and session tokens.
- Local user records: The server maps Clerk users into the `users` table for relational ownership.
- Poll management: Creators own polls and can list, create, inspect analytics, and publish results.
- Public poll access: Respondents access polls through slugs instead of internal UUIDs.
- Response collection: Responses are stored as a response row plus one row per answered question.
- Duplicate protection: Authenticated polls restrict one response per user per poll; anonymous polls use a client-side submission token.
- Analytics: Server computes analytics from stored responses and question responses.
- Real-time updates: Server broadcasts analytics updates to `poll:${pollId}` rooms after a response is saved.
- Database migrations: Drizzle migrations live in `server/drizzle/`.
- Local database: Docker Compose starts PostgreSQL for development.

## Tech Stack

Frontend:

- React 19
- Vite
- TypeScript
- React Router
- Clerk React SDK
- Axios
- Zustand
- Tailwind CSS 4
- Radix UI and shadcn-style primitives
- Lucide React icons
- Socket.IO client usage through local hooks

Backend:

- Bun runtime
- Express 5
- TypeScript
- Socket.IO
- Clerk Express middleware
- Drizzle ORM
- PostgreSQL
- Zod validation
- Docker Compose for local Postgres

## Project Structure

```txt
.
|-- client/
|   |-- src/
|   |   |-- components/
|   |   |-- hooks/
|   |   |-- lib/
|   |   |-- pages/
|   |   |-- store/
|   |   |-- types/
|   |   |-- App.tsx
|   |   `-- main.tsx
|   |-- .env.example
|   |-- package.json
|   `-- vite.config.ts
|-- server/
|   |-- drizzle/
|   |-- src/
|   |   |-- db/
|   |   |-- lib/
|   |   |-- modules/
|   |   |-- socket/
|   |   |-- env.ts
|   |   `-- index.ts
|   |-- .env.example
|   |-- docker-compose.yml
|   |-- drizzle.config.js
|   `-- package.json
|-- image.png
`-- Readme.md
```

## Environment Variables

Create environment files from the examples before running the apps.

### Client Env Example

Path: `client/.env`

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
VITE_API_URL=http://localhost:3000
```

Client variables:

- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key used by the React app.
- `VITE_API_URL` - Base URL of the backend API.

### Server Env Example

Path: `server/.env`

```env
PORT=3000
CLIENT=http://localhost:5173
DATABASE_URL=postgres://ADMIN:ADMIN@localhost:5432/llop_ap
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
```

Server variables:

- `PORT` - Express and Socket.IO server port.
- `CLIENT` - Frontend origin allowed by CORS and Socket.IO.
- `DATABASE_URL` - PostgreSQL connection string used by Drizzle.
- `CLERK_PUBLISHABLE_KEY` - Clerk public key.
- `CLERK_SECRET_KEY` - Clerk secret key used by the backend middleware.

## Docker

The project currently includes Docker Compose for the local PostgreSQL database. The app services themselves are run locally with Bun and Vite.

Path: `server/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:17
    restart: unless-stopped
    ports:
      - 5432:5432
    environment:
      - POSTGRES_USER=ADMIN
      - POSTGRES_PASSWORD=ADMIN
      - POSTGRES_DB=llop_ap
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Start the database:

```bash
cd server
docker compose up -d
```

Stop the database:

```bash
cd server
docker compose down
```

Remove the database volume when you intentionally want a fresh database:

```bash
cd server
docker compose down -v
```

## Local Setup

Prerequisites:

- Bun
- Docker Desktop or another Docker runtime
- Clerk application keys

Install dependencies:

```bash
cd server
bun install

cd ../client
bun install
```

Start PostgreSQL:

```bash
cd server
docker compose up -d
```

Run database migrations:

```bash
cd server
bun run db:migrate
```

Start the backend:

```bash
cd server
bun run dev
```

Start the frontend in another terminal:

```bash
cd client
bun run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

## Available Scripts

Client scripts:

```bash
bun run dev
bun run build
bun run lint
bun run preview
```

Server scripts:

```bash
bun run dev
bun run build
bun run start
bun run db:generate
bun run db:migrate
bun run db:migrate:prod
bun run db:studio
```

## Application Routes

Frontend routes:

- `/` - Creator workspace and poll list.
- `/builder` - Poll builder.
- `/dashboard/:pollId` - Creator analytics dashboard.
- `/p/:slug` - Public poll response page.

Backend routes:

- `GET /health` - Server health check.
- `GET /` - Basic server response.
- `GET /api/user/me` - Current Clerk-backed app user.
- `GET /api/poll` - List polls owned by the signed-in user.
- `POST /api/poll` - Create a poll.
- `GET /api/poll/:id` - Get one owned poll.
- `GET /api/poll/:id/analytics` - Get owned poll analytics.
- `POST /api/poll/:id/publish` - Publish final results.
- `GET /api/poll/public/:slug` - Get a public poll by slug.
- `POST /api/poll/public/:slug/submit` - Submit a public poll response.

## Socket Events

Client to server:

- `poll:join` - Dashboard joins `poll:${pollId}`.
- `poll:leave` - Dashboard leaves `poll:${pollId}`.

Server to client:

- `analytics:update` - Sent after a response is stored and analytics are recalculated.
- `poll:published` - Sent after the creator publishes results.

Only creator dashboard pages need to join poll rooms. Public respondent pages submit through REST.

## Database Model

Main tables:

- `users` - Local application users mapped to Clerk users.
- `polls` - Poll metadata, ownership, status, slug, settings, and publish state.
- `questions` - Poll questions and serialized answer options.
- `responses` - One submitted response to a poll.
- `question_responses` - One selected option for one question in one response.

Simplified relationships:

```txt
users.id              -> polls.created_by
users.id              -> responses.user_id nullable
polls.id              -> questions.poll_id
polls.id              -> responses.poll_id
responses.id          -> question_responses.response_id
questions.id          -> question_responses.question_id
```

Poll statuses:

- `draft` - Planned status for editable unpublished work.
- `active` - Accepting responses.
- `expired` - No longer accepting responses.
- `published` - Final results are visible.

Question types:

- `single_choice`
- `image_choice`

Current implementation note: newly created polls are inserted as `active`, so they can be shared immediately after creation.

## Data Flow

Response submission flow:

```txt
Respondent submits form
        |
        v
POST /api/poll/public/:slug/submit
        |
        v
Validate poll state, auth rules, required questions, and option ids
        |
        v
Insert into responses
        |
        v
Insert into question_responses
        |
        v
Rebuild analytics from database rows
        |
        v
Emit analytics:update to poll:${pollId}
        |
        v
Creator dashboard updates live
```

Creator dashboard flow:

```txt
Creator opens /dashboard/:pollId
        |
        v
GET /api/poll/:id/analytics
        |
        v
socket.emit("poll:join", pollId)
        |
        v
Wait for analytics:update events
        |
        v
Update Zustand store and render new stats
```

## API Payload Examples

Create poll:

```json
{
  "title": "Product direction",
  "description": "Help us choose the next roadmap priority.",
  "category": "product",
  "tags": ["roadmap", "feedback"],
  "accentColor": "#B6FF3B",
  "completionMessage": "Your response has been recorded.",
  "isAnonymous": true,
  "showLiveResults": false,
  "expiresAt": "2026-06-01T12:00:00.000Z",
  "questions": [
    {
      "question": "Which feature should we build first?",
      "isMandatory": true,
      "options": ["Analytics export", "Team permissions", "Custom themes"]
    }
  ]
}
```

Submit response:

```json
{
  "submissionToken": "client-generated-token",
  "respondentName": "Aalam",
  "respondentEmail": "aalam@example.com",
  "answers": [
    {
      "questionId": "question-uuid",
      "selectedOptionId": "option-id"
    }
  ]
}
```

## Build

Build frontend:

```bash
cd client
bun run build
```

Build backend TypeScript:

```bash
cd server
bun run build
```

## Production Notes

Before production deployment:

- Set real Clerk production keys.
- Set `CLIENT` to the deployed frontend origin.
- Set `VITE_API_URL` to the deployed backend URL.
- Use a managed PostgreSQL database or a production-safe Postgres container.
- Run Drizzle migrations against the production database.
- Restrict CORS to the real frontend domain.
- Serve the Vite build through a static host or CDN.
- Run the backend with process supervision.
- Add Dockerfiles for the client and server if the deployment target expects fully containerized app services.

## Future Improvements

- Add edit support for draft polls.
- Add explicit expire job or status transition for expired polls.
- Add image upload/storage for `image_choice` options.
- Add pagination and search for large poll lists.
- Add more analytics dimensions.
- Add automated tests for poll creation, response submission, auth behavior, and analytics.
- Add production Dockerfiles for the client and server.
