# InterviewPrep wireframes and navigation flow

These text wireframes document the screens currently implemented in the React client. Navigation is managed by state in `App.jsx`; authenticated page selection and theme preference are stored locally so they survive refreshes.

## Overall navigation

```text
Unauthenticated
  Login ───────────────> Register ───────────────> Login
    │
    └──> Forgot Password ── email link ──> Reset Password ──> Login

Successful login
  └──> Dashboard
         ├──> Practice Questions
         ├──> Mock Interview
         ├──> My Progress ── review item ──> selected Practice Question
         └──> My Profile

Sidebar Logout ── confirmation modal ──> Login
```

## Authentication shell

```text
┌──────────────────────────────┬──────────────────────────────┐
│ InterviewPrep                │ Active authentication card   │
│ Prepare with confidence      │                              │
│ Product introduction         │ Login / Register / Forgot /  │
│ and feature highlights       │ Reset Password form          │
└──────────────────────────────┴──────────────────────────────┘
```

### Login

- Email and password fields
- Forgot-password action
- Submit button with loading and API error states
- Link to registration

### Register

- Name, email, and password fields
- Account creation button with loading/error states
- Link back to login

### Forgot and Reset Password

- Forgot Password accepts an email and displays success/error feedback.
- Reset Password opens from a `resetToken` URL query parameter.
- Reset includes new-password and confirmation fields, validation, API feedback, and a return-to-login action.

## Authenticated application shell

```text
┌─────────────────────┬────────────────────────────────────────┐
│ InterviewPrep       │                                        │
│                     │ Current page content                   │
│ Dashboard           │                                        │
│ Practice Questions  │                                        │
│ Mock Interview      │                                        │
│ My Progress         │                                        │
│ My Profile          │                                        │
│                     │                                        │
│ Light/Dark toggle   │                                        │
│ User summary        │                                        │
│ Log out             │                                        │
└─────────────────────┴────────────────────────────────────────┘
```

On smaller screens, a menu button opens and closes the sidebar navigation.

## Dashboard

```text
┌──────────────────────────────────────────────────────────────┐
│ Welcome banner and quick actions                             │
├──────────────────────────────────────────────────────────────┤
│ Practice question count │ Interview count │ Best score       │
├─────────────────────────────────┬────────────────────────────┤
│ Recent score chart              │ Next-goal summary          │
├─────────────────────────────────┴────────────────────────────┤
│ Achievements and next-step cards                            │
└──────────────────────────────────────────────────────────────┘
```

The page loads interview statistics/results, shows loading or error feedback, and provides empty states before interviews are completed.

## Practice Questions

```text
┌──────────────────────────────────────────────────────────────┐
│ Practice Questions header                                   │
│ [Technical] [Behavioral] [General]                           │
├──────────────────────────────────────────────────────────────┤
│ Category                    Question n of total               │
│ Question text                         [Saved status]          │
│                                                              │
│ Your answer                                                  │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Editable answer textarea                                 │ │
│ └──────────────────────────────────────────────────────────┘ │
│ [Check My Answer] [Show suggested answer] [Reset Progress]   │
│ Suggested answer / self-assessment when opened               │
│ [Previous]                                            [Next] │
└──────────────────────────────────────────────────────────────┘
```

- Reset Progress appears only when progress exists for the current question.
- Self-assessment creates or updates `got_it`, `almost`, or `review` progress.
- Reset Progress deletes the current user's status without deleting the question.

## Mock Interview

### Setup

```text
┌──────────────────────────────────────────────┐
│ Mock Interview                               │
│ Choose: [Technical] [Behavioral] [General]   │
│ 5 questions • 5 minutes • one submission     │
│ [Start interview]                            │
└──────────────────────────────────────────────┘
```

### Active interview

```text
┌──────────────────────────────────────────────┐
│ Category interview                  04:59     │
│ Answered-count progress                       │
├──────────────────────────────────────────────┤
│ Question 1 and four radio options             │
│ Question 2 and four radio options             │
│ ...                                           │
├──────────────────────────────────────────────┤
│ answered / 5                     [Submit]      │
└──────────────────────────────────────────────┘
```

The client counts down from the server deadline, disables answers at 00:00, and submits automatically. A temporary automatic-submission failure can be retried. The server remains authoritative for the deadline and score.

### Result

- Score out of five and percentage
- Interview category
- Action to return to setup and try another interview

## My Progress

```text
┌──────────────────────────────────────────────────────────────┐
│ My Progress                                                  │
│ Total interviews │ Best score │ Average score                │
├──────────────────────────────────────────────────────────────┤
│ Growth chart, personal best, latest score, category summary  │
├──────────────────────────────────────────────────────────────┤
│ Questions to Review ── each item opens Practice Questions    │
├──────────────────────────────────────────────────────────────┤
│ Completed interview history                                 │
└──────────────────────────────────────────────────────────────┘
```

Loading, error, and empty states are displayed when data is pending, unavailable, or not yet created.

## My Profile

- User avatar initial
- Name and email from the authenticated profile
- Account information card

Logout remains available from the persistent sidebar and opens a confirmation modal before clearing authentication.

## Theme behavior

The sidebar toggle switches between light and dark modes. The preference is stored locally and applied before React renders on later visits to prevent a light flash during dark-mode startup.
