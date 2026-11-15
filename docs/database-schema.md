# InterviewPrep database schema

InterviewPrep uses MongoDB through Mongoose. Mongoose maps the six model names to the collections shown below. Every document also has the standard MongoDB `_id: ObjectId` field and Mongoose version key.

## Relationship overview

```text
User 1 ─── * QuestionProgress * ─── 1 Question
User 1 ─── * InterviewSession * ─── * MockQuestion
User 1 ─── * InterviewResult 1 ─── 1 InterviewSession
```

- A user can save one progress record per practice question.
- An interview session belongs to one user and contains references to mock questions.
- A completed session can have at most one interview result.
- Questions and mock questions are shared content; progress, sessions, and results are user-owned.

## `users` — `User`

Source: `server/models/User.js`

| Field | Type | Rules and purpose |
| --- | --- | --- |
| `name` | `String` | Required and trimmed |
| `email` | `String` | Required, unique, lowercased, and trimmed |
| `password_hash` | `String` | Required and excluded from normal queries; bcrypt-hashed before save |
| `resetTokenHash` | `String` | Optional and excluded from normal queries; SHA-256 hash of a reset token |
| `resetTokenExpiresAt` | `Date` | Optional and excluded from normal queries |

Sensitive password and reset fields are removed during JSON serialization.

## `questions` — `Question`

Source: `server/models/Question.js`

| Field | Type | Rules and purpose |
| --- | --- | --- |
| `category` | `String` | Required; `Technical`, `Behavioral`, or `General` |
| `questionText` | `String` | Required and trimmed |
| `suggestedAnswer` | `String` | Required and trimmed |

The compound `{ category, questionText }` index is unique.

## `mockquestions` — `MockQuestion`

Source: `server/models/MockQuestion.js`

| Field | Type | Rules and purpose |
| --- | --- | --- |
| `category` | `String` | Required; `Technical`, `Behavioral`, or `General` |
| `questionText` | `String` | Required and trimmed |
| `options` | `[String]` | Required; exactly four non-empty choices |
| `correctAnswerIndex` | `Number` | Required integer from 0 through 3 |

The compound `{ category, questionText }` index is unique. Correct answers remain on the server and are not returned when an interview starts.

## `questionprogresses` — `QuestionProgress`

Source: `server/models/QuestionProgress.js`

| Field | Type | Rules and purpose |
| --- | --- | --- |
| `user` | `ObjectId` | Required reference to `User` |
| `question` | `ObjectId` | Required reference to `Question` |
| `status` | `String` | Required; `got_it`, `almost`, or `review` |
| `updatedAt` | `Date` | Automatically maintained by Mongoose |

The compound `{ user, question }` index is unique, so each user has at most one status per question. The API provides create, read, update, and delete operations for this resource. Ownership filters include the authenticated user ID.

## `interviewsessions` — `InterviewSession`

Source: `server/models/InterviewSession.js`

| Field | Type | Rules and purpose |
| --- | --- | --- |
| `user` | `ObjectId` | Required reference to `User` |
| `category` | `String` | Required; `Technical`, `Behavioral`, or `General` |
| `questions` | `[ObjectId]` | Required references to `MockQuestion` documents |
| `deadline` | `Date` | Required server-authoritative submission deadline |
| `submittedAt` | `Date` or `null` | Defaults to `null`; set when submission claims the session |
| `createdAt` | `Date` | Automatically maintained by Mongoose |
| `updatedAt` | `Date` | Automatically maintained by Mongoose |

The submit route filters by both session ID and authenticated user ID. An atomic update of `submittedAt` prevents two submissions from claiming the same session.

## `interviewresults` — `InterviewResult`

Source: `server/models/InterviewResult.js`

| Field | Type | Rules and purpose |
| --- | --- | --- |
| `session` | `ObjectId` | Required, unique reference to `InterviewSession` |
| `user` | `ObjectId` | Required reference to `User` |
| `category` | `String` | Required; `Technical`, `Behavioral`, or `General` |
| `score` | `Number` | Required, minimum 0; calculated by the server |
| `totalQuestions` | `Number` | Required, minimum 1 |
| `completedAt` | `Date` | Defaults to the current time |

The unique `session` field enforces one persisted result per interview session. Results and aggregate statistics are queried by authenticated user ID.
