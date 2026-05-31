# Novelsive — Master Requirements Document

> **Stack:** Next.js (Frontend) · Node.js/Express (Backend API) · Python (NLP Pipeline) · MySQL (Database via phpMyAdmin)
> **Sprints:** 8 · **Total PBs:** 17 · **Total FRs:** 37 · **Total NFRs:** 40

---


## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [User Roles](#3-user-roles)
4. [Module 1 — Account Module](#4-module-1--account-module)
5. [Module 2 — Navigation Bar](#5-module-2--navigation-bar)
6. [Module 3 — Novel Module](#6-module-3--novel-module)
7. [Module 4 — NLP & Immersive Reading](#7-module-4--nlp--immersive-reading)
8. [Module 5 — Admin Module](#8-module-5--admin-module)
9. [Cross-Cutting NFRs](#9-cross-cutting-nfrs)
10. [Emotion-to-Environment Mapping](#10-emotion-to-environment-mapping)
11. [NLP Recommendation Pipeline](#11-nlp-recommendation-pipeline)
12. [Sprint Plan](#12-sprint-plan)
13. [Checklist — Everything To Build](#13-checklist--everything-to-build)

---

## 1. Project Overview

**Novelsive** is an immersive novel reading platform where:

- **Readers** browse, read, rate, and comment on novels
- **Authors** write, publish, and manage their novels and chapters
- **Admins** review manuscripts, manage content, and monitor platform analytics
- The **NLP pipeline** analyzes chapter text at upload time, assigns an emotion per paragraph block, and drives ambient audio environments while the user reads — creating an immersive, mood-reactive reading experience
- A **recommendation engine** uses reading behavior and NLP emotion metadata to surface relevant novels to each reader

---

## 2. System Architecture

``Majority of the functions will be inside the next.js frontend. the backend is just a bridge for nlp and next.js

next.js will do all functions that it can support, the backend is only a support for things that next.js can't do 
┌─────────────────────────────────────────────┐
│               Next.js Frontend              │
│  Pages · Components · Swipe/Slide Reader    │
│  Immersive Environment (Audio Layer)
Auth (JWT + Argon2id) · RBAC Middleware   │
│  Novel CRUD · Comments · Ratings · History │
│  Admin Routes · Recommendation Queries   │
└────────────────┬────────────────────────────┘
                 │ REST API (JSON)
┌────────────────▼────────────────────────────┐
│           Node.js / Express API             │
│  Acts as a bridge that connects the NLP Service with Next.js Frontend │
└────────┬──────────────────┬─────────────────┘
         │                  │
┌────────▼──────┐  ┌────────▼────────────────┐
│    MySQL      │  │   Python NLP Service    │
│ (phpMyAdmin)  │  │  (runs at chapter upload│
│               │  │   stores results to DB) │
└───────────────┘  └─────────────────────────┘
```

**Key architectural decisions to implement:**
- JWT stored in `httpOnly` cookies (not `localStorage`)
- RBAC enforced at the API layer via middleware — never trust the client for role checks
- NLP runs asynchronously after chapter publish — it must not block the author's publish flow
- Paragraph emotion data is pre-computed and fetched at read time; no live NLP during reading
- All environment (audio teardown must fully release browser media resources

---

## 3. User Roles

| Role | Permissions |
|------|-------------|
| **Reader** | Browse novels, read chapters, rate, comment, view reading history, see recommendations |
| **Author** | All Reader permissions + create/edit/publish novels and chapters |
| **Admin** | All Author permissions + review manuscripts, tag mature content, deactivate novels, view dashboard analytics |

> RBAC is enforced server-side on every protected route. The role is stored in the database and embedded in the JWT payload.

---

## 4. Module 1 — Account Module

### PB001 · User Registration · Sprint 1 · Priority 1

**User Story:** As a new user, I want to register an account so that I can access the system.

**Acceptance Criteria:**
1. User can input username, email, password, date of birth, role selection (Reader / Author), and optional profile image
2. System validates all required fields
3. System prevents duplicate email accounts
4. Account is successfully created and stored after submission
5. User is assigned a role upon registration
6. hCaptcha must be completed before form submission is allowed

#### Functional Requirements

**FR-001** — Registration form fields
- [ ] Render fields: username, email, password, date of birth, role selector (Reader / Author), profile image (optional)
- [ ] Mark image field as optional with clear UI indicator
- [ ] Date of birth field accepts valid date format only (use a date picker component)
- [ ] Role selection (Reader / Author) is required

**FR-002** — Field validation
- [ ] Show inline error messages on empty required fields
- [ ] Email must match RFC-standard format (validate client + server side)
- [ ] Password must meet minimum strength: 8+ chars, 1 uppercase, 1 number, 1 special char

**FR-003** — Duplicate account prevention
- [ ] Query database for existing email before creating account
- [ ] Return a specific, user-friendly error message on duplicate email
- [ ] Check happens server-side (do not rely only on client validation)

**FR-004** — Role-Based Access Control (RBAC) at registration
- [ ] User selects role (Reader or Author) on the registration form
- [ ] Role stored in the `users` table and embedded in JWT payload on login
- [ ] API middleware reads role from JWT and gates routes accordingly
- [ ] Authors-only routes: `/my-novels`, `/write`, `/publish`
- [ ] Admin-only routes: `/admin/*`

**FR-005** — hCaptcha bot protection
- [ ] Render hCaptcha widget on registration form (use `@hcaptcha/react-hcaptcha`)
- [ ] Block form submission if hCaptcha is not completed
- [ ] Validate hCaptcha token server-side via hCaptcha's verify endpoint before processing registration
- [ ] Return 400 if token is missing or invalid

#### Non-Functional Requirements
- [ ] **NFR-001** Passwords hashed with **Argon2id** (memory: 64 MB, iterations: 3, parallelism: 2) — no bcrypt, no plaintext
- [ ] **NFR-002** Registration API responds in ≤ 2 seconds under normal load
- [ ] **NFR-003** All form data transmitted over HTTPS / TLS 1.2+
- [ ] **NFR-004** RBAC roles enforced server-side only; client-side role checks are UI convenience, never authorization
- [ ] **NFR-005** hCaptcha secret key stored in environment variables, never hardcoded

---

### PB002 · User Login / Logout · Sprint 1 · Priority 2

**User Story:** As a registered user, I want to login or logout of the system so that I can access or exit my account securely.

**Acceptance Criteria:**
1. User can input email and password
2. System verifies credentials against database
3. User is redirected to homepage after successful login
4. Rate limit of minimum 5 failed attempts enforced
5. Error message appears if credentials are incorrect
6. Logout button available in navbar and terminates session

#### Functional Requirements

**FR-004 (Login branch)** — User authentication
- [ ] Login form accepts email and password
- [ ] Verify password against Argon2id hash in database
- [ ] On success: issue JWT in `httpOnly` cookie, redirect to homepage
- [ ] On failure: return generic error ("Invalid email or password") — do not reveal which field is wrong

**FR-005** — Rate limiting on login
- [ ] Lock account after 5 consecutive failed login attempts
- [ ] Display lockout duration to the user (e.g. "Too many attempts. Try again in 15 minutes.")
- [ ] Lockout tracked server-side (Redis or DB counter with TTL)

**FR-006** — Logout
- [ ] Logout button visible in navbar at all times when authenticated
- [ ] On logout: clear `httpOnly` JWT cookie, invalidate session server-side
- [ ] Redirect user to login page after logout

#### Non-Functional Requirements
- [ ] **NFR-004** Session tokens (JWT) expire after 24 hours of inactivity
- [ ] **NFR-005** All login attempts (success and failure) logged with timestamp and IP for security auditing
- [ ] **NFR-006** Auth endpoints respond in ≤ 1 second

---

### PB003 · Password Recovery · Sprint 2 · Priority 3

**User Story:** As a user who forgot my password, I want to reset my password so that I can regain access to my account.

**Acceptance Criteria:**
1. User can request password reset via email
2. System sends a password reset link to the registered email
3. User can create a new password via the link
4. Password reset confirmation is displayed

#### Functional Requirements

**FR-007** — Password reset email
- [ ] "Forgot Password" link on login page opens reset request form
- [ ] User enters registered email; system sends reset email within 60 seconds
- [ ] Reset link is unique, one-time use, and expires after 1 hour
- [ ] If email not found, show neutral message ("If this email is registered, a link has been sent") — do not confirm whether email exists

**FR-008** — New password form
- [ ] Reset link leads to a set-new-password form
- [ ] New password must pass strength validation (same rules as registration)
- [ ] Old password (and all active sessions) invalidated immediately on successful reset
- [ ] Show success confirmation screen after reset

#### Non-Functional Requirements
- [ ] **NFR-007** Reset tokens must be cryptographically random (use `crypto.randomBytes(32)`) and expire after 1 hour
- [ ] **NFR-008** Used reset tokens invalidated immediately after use (one-time-use)

---

### PB004 · Account Management · Sprint 2 · Priority 4

**User Story:** As a registered user, I want to manage my account information so that I can keep my details updated.

**Acceptance Criteria:**
1. User can edit username, email, password, and profile image
2. Updated data is validated and saved in database
3. Changes reflect immediately in the user profile
4. Cancel button redirects back to homepage

#### Functional Requirements

**FR-009** — Editable profile page
- [ ] Profile page pre-fills all fields with current user data
- [ ] Cancel button discards all changes and redirects to homepage (no save)
- [ ] Save button submits validated changes to the API

**FR-010** — Profile update validation
- [ ] Email uniqueness re-checked on update (exclude current user's own email)
- [ ] Profile image: validate file type (JPEG/PNG only) and size (≤ 5 MB) client + server side
- [ ] Show success toast notification on successful save

#### Non-Functional Requirements
- [ ] **NFR-009** Profile image uploads limited to 5 MB, JPEG/PNG only; reject other formats server-side
- [ ] **NFR-010** Profile update API responds in ≤ 2 seconds

---

## 5. Module 2 — Navigation Bar

### PB005 · Account Navigation / Logout · Sprint 3 · Priority 5

**User Story:** As a user, I want to navigate my account through a profile menu so that I can access account settings and logout.

**Acceptance Criteria:**
1. Clickable circular avatar in navbar with dropdown
2. Dropdown shows username, account profile link, and logout
3. Navigation to account and logout works correctly

#### Functional Requirements

**FR-011** — Profile avatar dropdown
- [ ] Display circular avatar in top-right of navbar (show user's profile image or a default avatar)
- [ ] Clicking avatar toggles a dropdown menu
- [ ] Dropdown contains: username (non-clickable label), "Account Profile" link, "Logout" button
- [ ] Clicking outside the dropdown closes it

#### Non-Functional Requirements
- [ ] **NFR-011** Dropdown renders without layout shift on all screen sizes (mobile + desktop)
- [ ] **NFR-012** Dropdown is keyboard-accessible (Tab, Enter, Escape) — WCAG 2.1 AA compliant

---

### PB006 · Novel Page Navigation · Sprint 3 · Priority 6

**User Story:** As a user, I want to navigate different pages of the system so that I can access available features.

**Acceptance Criteria:**
1. My Novels page accessible to Authors only
2. Browse / Categories page accessible to Readers
3. Homepage with all novels visible to all
4. Search bar works by novel title and author name
5. Dashboard accessible to Admins only

#### Functional Requirements

**FR-012** — Role-based navigation links
- [ ] Authors see: "My Novels" link in navbar
- [ ] Readers see: "Browse", "Categories" links
- [ ] Admins see: "Dashboard" link
- [ ] All users see: Homepage, Search bar

**FR-013** — Global search bar
- [ ] Search input filters by novel title and author name
- [ ] Results update as user types (debounce: 300 ms)
- [ ] Show empty state message when no results found
- [ ] Search results link directly to the novel profile page

#### Non-Functional Requirements
- [ ] **NFR-013** Search results appear within 500 ms of last keystroke
- [ ] **NFR-014** Navigation bar is consistent and present on all pages

---

## 6. Module 3 — Novel Module

### PB007 · Write Novel · Sprint 4 · Priority 7

**User Story:** As an author, I want to write a novel so that I can publish my story.

**Acceptance Criteria:**
1. Author inputs title, synopsis, front cover image, title image, and genre(s)
2. Author writes chapters using a rich text editor (bold, italic, underline)
3. Publish button sends manuscript to admin for verification
4. Author can edit and re-publish unverified manuscripts
5. Novel appears in "My Novels" with a verified / unverified tag

#### Functional Requirements

**FR-014** — Novel creation form
- [ ] Fields: title (required), synopsis (required), front cover image (required), title image (required), genre multi-select (required)
- [ ] Validate all required fields before allowing chapter creation
- [ ] Genre supports selecting multiple values from a predefined list

**FR-015** — Chapter writing interface
- [ ] Rich text editor with: bold, italic, underline toolbar buttons
- [ ] Chapter content stored as structured HTML or Markdown in the database
- [ ] Author can create multiple chapters and navigate between them

**FR-016** — Chapter submission to admin
- [ ] "Publish" button submits chapter to admin review queue
- [ ] Submitted chapters show status badge: "Pending Review"
- [ ] Author can edit and re-submit a chapter while it is in "Pending Review" state
- [ ] Once admin approves, chapter status changes to "Published" and is locked from editing

#### Non-Functional Requirements
- [ ] **NFR-015** Chapter content auto-saves every 30 seconds to prevent data loss (use debounced API call or draft save)
- [ ] **NFR-016** Rich text editor is usable on mobile screen sizes
- [ ] **NFR-017** Novel cover images compressed server-side to ≤ 500 KB on upload (use Sharp or Pillow)

---

### PB008 · Novel Profile · Sprint 4 · Priority 8

**User Story:** As a user, I want to see the novel profile so that I can decide if I want to read it.

**Acceptance Criteria:**
1. Display cover image, rating, title, and synopsis
2. Display author information and genre(s)
3. Display ordered list of chapters
4. Rating widget visible

#### Functional Requirements

**FR-017** — Novel profile page
- [ ] Display: cover image, title, author name, genre tags, synopsis, average rating, total view count
- [ ] Chapter list displayed in order with chapter numbers and titles
- [ ] Star rating widget shows current average; authenticated users can submit or update their rating

#### Non-Functional Requirements
- [ ] **NFR-018** Novel profile page loads in ≤ 2 seconds
- [ ] **NFR-019** Cover images use lazy loading (`loading="lazy"` or Intersection Observer)

---

### PB009 · Review and Comment · Sprint 5 · Priority 9

**User Story:** As a user, I want to review and comment on novels so that I can interact with the story.

**Acceptance Criteria:**
1. Users can leave a comment at the end of each chapter
2. Users can see other readers' comments
3. Users can rate a novel (1–5 stars)
4. Rating visible on Novel Profile and in novel listing views

#### Functional Requirements

**FR-018** — Chapter comment section
- [ ] Comment input field at the bottom of every chapter page
- [ ] Comments displayed sorted by newest first
- [ ] Comments saved to database and persisted across sessions
- [ ] Comments are per-chapter (not per novel)

**FR-019** — Novel rating (1–5 stars)
- [ ] Interactive star rating widget on novel profile
- [ ] Average rating recalculated on every new submission
- [ ] User can update their own previously submitted rating
- [ ] Rating displayed on novel cards throughout the app

#### Non-Functional Requirements
- [ ] **NFR-020** Comment submission API responds in ≤ 1 second
- [ ] **NFR-021** Ratings stored one-per-user-per-novel in database to prevent duplicate votes

---

### PB010 · Reading History · Sprint 5 · Priority 10

**User Story:** As a user, I want the system to save my reading history so that I can continue reading later.

**Acceptance Criteria:**
1. System stores last read chapter for each novel
2. User can resume reading from saved location
3. Reading history accessible from homepage

#### Functional Requirements

**FR-020** — Auto-save reading position
- [ ] Save chapter index to database when user opens a chapter
- [ ] Save paragraph block index to database when user navigates between paragraph slides
- [ ] "Continue Reading" / "Resume" button on novel profile links to last saved chapter + paragraph position
- [ ] Reading history section on homepage shows recently read novels

#### Non-Functional Requirements
- [ ] **NFR-022** Reading position saved within 2 seconds of chapter/paragraph change
- [ ] **NFR-023** Reading history stored in the database per user — do not use `localStorage` or `sessionStorage`

---

### PB011 · Novel Discovery & Mature Content · Sprint 6 · Priority 11

**User Story:** As a user, I want to browse novels and see popular novels so that I can discover stories.

**Acceptance Criteria:**
1. Browse top rated, top viewed, and newly updated novels
2. Reading history section visible
3. Recommended novels section visible
4. Mature-tagged novel covers are blurred

#### Functional Requirements

**FR-021** — Homepage novel sections
- [ ] Render sections: "Top Rated", "Top Views", "Newly Updated", "Continue Reading" (history), "Recommended For You"
- [ ] Each section shows novel cards: cover thumbnail, title, average rating
- [ ] Sections are horizontally scrollable on mobile

**FR-022** — Mature content blurring
- [ ] Mature-tagged novel covers blurred by default using CSS filter (`filter: blur(12px)`)
- [ ] Users who have opted into mature content (in settings) see unblurred covers
- [ ] Age verification gate shown if underage user (based on date of birth) attempts to enable mature content
- [ ] Blur applied before image fully renders (prevent flash of unblurred content)

#### Non-Functional Requirements
- [ ] **NFR-024** Homepage loads initial novel lists in ≤ 3 seconds
- [ ] **NFR-025** Mature content blur applied client-side using CSS before the image paints

---

## 7. Module 4 — NLP & Immersive Reading

### PB012 · Immersive Paragraph Reading Interface · Sprint 6 · Priority 12

**User Story:** As a user, I want to read novels in an immersive paragraph-by-paragraph interface.

**Acceptance Criteria:**
1. Chapter content split into paragraph blocks of ≤ 200 words
2. Navigate paragraphs by clicking left/right arrows or swiping left/right
3. Current paragraph block index saved; on refresh, resumes from last paragraph
4. NLP emotion pre-computed per paragraph and fetched from DB at read time
5. Primary emotion (highest score) mapped to: `joy | sadness | anger | fear | surprise | love | neutral | disgust`
6. 5-second dwell on a slide before immersive environment appears
7. System detects 5 continuous seconds on slide before triggering effect
8. `neutral` emotion → no environment triggered
9. Consecutive emotional paragraphs: previous environment fades out over 3 seconds and is fully destroyed (no memory leaks), then new effect starts after its own 5-second delay

#### Functional Requirements

**FR-023** — Paragraph block splitting
- [ ] Split chapter text into blocks of ≤ 200 words at sentence boundaries (never mid-sentence)
- [ ] Each block stored with an index in the database, linked to the chapter
- [ ] Paragraph block index saved to user's reading position in DB on every slide change

**FR-024** — Left/right navigation + swipe gestures
- [ ] Left arrow button (or swipe-left gesture) navigates to previous paragraph
- [ ] Right arrow button (or swipe-right gesture) navigates to next paragraph
- [ ] Navigation arrows disabled (and visually greyed out) at first and last paragraph
- [ ] Use a touch gesture library (e.g. `react-swipeable` or native touch events)

**FR-025** — Paragraph position restoration on refresh
- [ ] On chapter load, fetch last saved paragraph index from database
- [ ] Render the chapter starting at the saved paragraph index
- [ ] Immersive environment resets on refresh and re-triggers after 5-second dwell from the restored paragraph

**FR-026** — NLP emotion fetch
- [ ] NLP analysis runs at chapter upload/publish time (Python pipeline, async — not at read time)
- [ ] Primary emotion (highest confidence score) stored per paragraph block in database
- [ ] Emotion is one of exactly 8 labels: `joy`, `sadness`, `anger`, `fear`, `surprise`, `love`, `neutral`, `disgust`
- [ ] On paragraph render, fetch emotion label from DB (single query, pre-computed)

**FR-027** — 5-second dwell → immersive environment trigger
- [ ] Start a 5-second countdown timer when a paragraph slide becomes active
- [ ] Reset timer to 0 if user navigates away from the slide before 5 seconds elapse
- [ ] After exactly 5 continuous seconds on the slide, trigger the immersive environment (audio)
- [ ] If emotion is `neutral`, do not trigger any environment (skip entirely)

**FR-028** — Consecutive environment transition (no memory leaks)
- [ ] When navigating from a paragraph with an active environment to another emotional paragraph:
  - [ ] Begin fading out the current environment over 3 seconds (`opacity` CSS transition)
  - [ ] After fade completes: call `.pause()` and remove all audio DOM elements
  - [ ] Remove all event listeners attached to the previous environment
  - [ ] Release AudioContext / media resources (`audioContext.close()`)
  - [ ] Only after full cleanup: start the 5-second dwell timer for the new paragraph's environment
- [ ] Verify: no `<audio>` or  elements linger in the DOM after transition
- [] The audio will loop if the user stays in the same slide for more than the duration of the audio asset but with a 3 second delay of the audio starting again
- [] There is a button to disable the immersive environment located in the top right corner of the reading page

#### Non-Functional Requirements
- [ ] **NFR-026** Audio environment assets preloaded (use `<link rel="preload">` or JS preload) to prevent delay beyond the 5-second trigger
- [ ] **NFR-027** Environment teardown must fully release browser media resources — no memory leaks (test with Chrome DevTools Memory tab)
- [ ] **NFR-028** Paragraph block layout is responsive on mobile and desktop
- [ ] **NFR-029** NLP emotion fetch from DB completes in ≤ 300 ms

---

### PB013 · NLP Recommendation Engine · Sprint 7 · Priority 13

**User Story:** As a user, I want the system to recommend novels so that I can discover stories I may like.

**Acceptance Criteria:**
1. NLP pipeline extracts dominant emotion, secondary emotion, genres, and tags from each chapter at upload
2. System tracks user reading behavior: novels read, chapters completed, reading duration, likes/saves, favorite genres, dominant emotions consumed
3. Recommendations generated based on similar genres, emotions, and tags
4. Recommended novels appear dynamically on homepage

#### Functional Requirements

**FR-029** — NLP metadata extraction at chapter upload
- [ ] Python NLP pipeline triggered asynchronously after chapter is published/approved
- [ ] Pipeline output per chapter stored in database:
  ```json
  {
    "dominantEmotion": "sadness",
    "secondaryEmotion": "fear",
    "genres": ["fantasy", "drama"],
    "tags": ["war", "betrayal", "magic"]
  }
  ```
- [ ] Pipeline runs in background (use a job queue: Celery, BullMQ, or similar); does not block publish flow

**FR-030** — User reading behavior tracking
- [ ] Track and store per user:
  - Novels read (novel IDs)
  - Chapters completed (chapter IDs)
  - Reading duration (time spent per chapter, in seconds)
  - Liked / saved novels
  - Favorite genres (derived from reading history)
  - Dominant emotions consumed (aggregated from paragraph emotion labels encountered)
- [ ] Aggregate into a `user_preference_profile` record updated on each reading session

**FR-031** — Recommendation generation
- [ ] Query novels that share genres, dominant emotions, or tags with the user's preference profile
- [ ] Exclude novels the user has already read
- [ ] Return a minimum of 5 recommended novels
- [ ] Display recommendations in the "Recommended For You" section on homepage

#### Non-Functional Requirements
- [ ] **NFR-030** NLP chapter analysis completes within 30 seconds of chapter upload (async, so does not affect UX)
- [ ] **NFR-031** Recommendation query returns results in ≤ 2 seconds
- [ ] **NFR-032** User behavior data anonymized in any analytics exports or reports

---

## 8. Module 5 — Admin Module

### PB014 · Manuscript Review · Sprint 8 · Priority 14

**User Story:** As an admin, I want to review manuscripts so that I can approve or reject novels.

**Acceptance Criteria:**
1. Page shows all pending manuscripts with cover, title, image, rating, view count
2. Admin can read full manuscript content
3. Accept button approves and publishes
4. Reject button opens modal for rejection reason (title + description)
5. Rejection message sent to the novel's author

#### Functional Requirements

**FR-032** — Admin manuscript review queue
- [ ] Page at `/admin/manuscripts` lists all pending manuscripts
- [ ] Each entry shows: cover image, title, author name, submission date
- [ ] Clicking an entry opens the full manuscript for reading

**FR-033** — Accept / Reject actions
- [ ] "Accept" button: sets chapter status to "Published", removes from queue
- [ ] "Reject" button: opens modal with fields — rejection letter title + description
- [ ] On rejection: send in-app notification and/or email to the novel's author containing the rejection reason
- [ ] Both actions are logged with admin ID and timestamp

#### Non-Functional Requirements
- [ ] **NFR-033** All manuscript review actions logged with admin user ID and timestamp
- [ ] **NFR-034** Rejection notification delivered to author within 60 seconds of admin action

---

### PB015 · Tagging Mature Content · Sprint 8 · Priority 15

**User Story:** As an admin, I want to tag mature content novels so that the system can restrict them properly.

**Acceptance Criteria:**
1. Page shows pending novel reviews with novel front page details
2. Modal shows full novel profile
3. Validate button approves the novel
4. Reject button opens modal for reason
5. Author can self-tag a novel as mature during creation

#### Functional Requirements

**FR-034** — Author self-tagging
- [ ] Mature content toggle on novel creation form
- [ ] If toggled: novel is sent to admin mature content review queue after creation

**FR-035** — Admin mature content validation
- [ ] Review queue at `/admin/mature-review` lists novels pending mature content validation
- [ ] Admin opens each novel's profile in a modal
- [ ] "Validate" button confirms mature tag — novel's `is_mature` flag set to `true`
- [ ] "Reject" button: removes mature tag, notifies author, modal with rejection reason
- [ ] Once `is_mature = true`, cover images are blurred across the entire platform within 5 seconds

#### Non-Functional Requirements
- [ ] **NFR-035** Mature content flag propagates to homepage cover blur within 5 seconds of admin action
- [ ] **NFR-036** All mature content decisions logged for compliance (admin ID, action, timestamp, novel ID)

---

### PB016 · Novel Profile (Admin Side) · Sprint 8 · Priority 16

**User Story:** As an admin, I want to see novel profiles so that I can manage novel content.

**Acceptance Criteria:**
1. Display cover, rating, title, synopsis
2. Display chapter list
3. Deactivate button with SweetAlert confirmation
4. Deactivated novels removed from homepage, moved to deactivated list
5. Admin can reactivate novels

#### Functional Requirements

**FR-036** — Novel deactivation / reactivation
- [ ] Admin novel profile shows a "Deactivate" button
- [ ] Clicking "Deactivate" triggers a SweetAlert2 confirmation dialog: "Are you sure? This novel will be hidden from all users."
- [ ] On confirm: set `is_active = false`, novel disappears from all user-facing pages
- [ ] Deactivated novels appear in `/admin/deactivated` list
- [ ] "Reactivate" button in deactivated list sets `is_active = true`, restores novel to homepage
- [ ] SweetAlert2 confirmation also shown for reactivation

#### Non-Functional Requirements
- [ ] **NFR-037** Deactivation/reactivation takes effect across all active sessions within 5 seconds
- [ ] **NFR-038** All novel deactivation/reactivation actions audit-logged (admin ID, action, timestamp, novel ID)

---

### PB017 · Admin Dashboard · Sprint 8 · Priority 17

**User Story:** As an admin, I want to see dashboard analytics so that I can understand platform activity.

**Acceptance Criteria:**
1. Bar graph showing novel count by genre
2. Top 20 novels by view count
3. Total user and novel count displayed
4. System usage statistics visible

#### Functional Requirements

**FR-037** — Admin analytics dashboard
- [ ] Summary cards: total registered users, total published novels, total chapters
- [ ] Bar chart: number of novels per genre (use Recharts or Chart.js)
- [ ] Table: top 20 novels ranked by view count (novel title, author, view count, rating)
- [ ] Data refreshes automatically every 5 minutes without page reload

#### Non-Functional Requirements
- [ ] **NFR-039** Dashboard data auto-refreshes every 5 minutes (use polling or WebSocket)
- [ ] **NFR-040** Dashboard charts render in ≤ 3 seconds

---

## 9. Cross-Cutting NFRs

These apply to the entire system regardless of module.

| ID | Requirement |
|----|-------------|
| **Security** | All API routes behind authentication middleware except `/register`, `/login`, `/forgot-password` |
| **Security** | JWT stored in `httpOnly` cookies — never in `localStorage` |
| **Security** | HTTPS / TLS 1.2+ enforced on all endpoints |
| **Security** | All user inputs sanitized server-side to prevent XSS and SQL injection |
| **RBAC** | Role checked server-side on every protected route — client role is display-only |
| **Performance** | API endpoints should respond in ≤ 2 seconds under normal load (exceptions noted per FR) |
| **Accessibility** | Key interactive elements keyboard-accessible (WCAG 2.1 AA minimum) |
| **Mobile** | All pages and components responsive across mobile and desktop breakpoints |
| **Error Handling** | All API errors return structured JSON: `{ "error": "message", "code": "ERROR_CODE" }` |
| **Logging** | Security-relevant actions (login, logout, admin actions, manuscript review) logged with timestamp and user ID |

---

## 10. Emotion-to-Environment Mapping

When the NLP pipeline assigns a primary emotion to a paragraph block, the reading interface triggers the corresponding immersive environment after a 5-second dwell. `neutral` produces no environment.

| Emotion | Environment Description | Trigger |
|---------|------------------------|---------|
| `joy` | sfx in folder| After 5s dwell |
| `sadness` | sfx in folder| After 5s dwell |
| `anger` | Red-tinted overlay on the whole screen for 3 seconds | After 5s dwell |
| `fear` | sfx in folder | After 5s dwell |
| `surprise` | sfx in folder | After 5s dwell |
| `love` | sfx in folder | After 5s dwell |
| `disgust` | Green-tinted overlay on the whole screen for 3 seconds | After 5s dwell |
| `neutral` | **No environment triggered** | — |

**Transition rules:**
1. Previous environment fades over **3 seconds** then is fully destroyed (DOM removed, media released)
2. New paragraph's **5-second dwell timer** starts only after cleanup of previous environment completes
3. On page refresh: environments reset; 5-second timer restarts from the restored paragraph

---

## 11. NLP Recommendation Pipeline

```
Step 1 — At Chapter Upload (Python, async)
─────────────────────────────────────────
NLP pipeline runs on chapter text and stores:
{
  "chapterId": "...",
  "dominantEmotion": "sadness",
  "secondaryEmotion": "fear",
  "genres": ["fantasy", "drama"],
  "tags": ["war", "betrayal", "magic"]
}

Step 2 — During Reading (Node.js, per session)
──────────────────────────────────────────────
Track per user:
- novels_read[]
- chapters_completed[]
- reading_duration_seconds (per chapter)
- liked_novel_ids[]
- saved_novel_ids[]
- emotions_consumed[] → aggregate into favoriteEmotion
- genres_read[]      → aggregate into favoriteGenre

Step 3 — Recommendation Query (Node.js API)
───────────────────────────────────────────
SELECT novels WHERE:
  genre IN user.favoriteGenres
  OR dominantEmotion = user.favoriteEmotion
  OR tags OVERLAP user.readTagHistory
  AND novel_id NOT IN user.novels_read
ORDER BY match_score DESC
LIMIT 10
```

---

## 12. Sprint Plan

| Sprint | PB IDs | Focus |
|--------|--------|-------|
| Sprint 1 | PB001, PB002 | Auth — Registration (RBAC, Argon2id, hCaptcha), Login (rate limiting, JWT) |
| Sprint 2 | PB003, PB004 | Auth — Password recovery, Account management |
| Sprint 3 | PB005, PB006 | Navigation bar, Role-based nav links, Global search |
| Sprint 4 | PB007, PB008 | Novel creation, Chapter writing (rich text), Novel profile page |
| Sprint 5 | PB009, PB010 | Comments, Ratings, Reading history & resume |
| Sprint 6 | PB011, PB012 | Homepage discovery, Mature content blur, Immersive paragraph reader, NLP emotion environments |
| Sprint 7 | PB013 | NLP recommendation engine, User behavior tracking |
| Sprint 8 | PB014–PB017 | Admin — Manuscript review, Mature tagging, Novel management, Dashboard analytics |

---

## 13. Checklist — Everything To Build

Use this as your running task list as you work through each module.

### 🔐 Authentication & RBAC
- [ ] Registration form (Next.js page + form component)
- [ ] hCaptcha integration (`@hcaptcha/react-hcaptcha`)
- [ ] POST `/api/auth/register` — validate, hash with Argon2id, store user + role
- [ ] POST `/api/auth/login` — verify Argon2id hash, issue JWT in httpOnly cookie
- [ ] Rate limiter middleware on login (5 attempts → lockout)
- [ ] POST `/api/auth/logout` — clear cookie, invalidate session
- [ ] POST `/api/auth/forgot-password` — generate crypto token, send reset email
- [ ] POST `/api/auth/reset-password` — validate token, hash new password, invalidate token
- [ ] RBAC middleware — read role from JWT, gate routes by role
- [ ] Protect all routes except `/register`, `/login`, `/forgot-password`

### 👤 Account & Profile
- [ ] Profile page (Next.js) — display and edit user info
- [ ] PUT `/api/users/:id` — validate and update user data
- [ ] Profile image upload — validate type/size, compress, store
- [ ] Navbar avatar dropdown (username, profile link, logout)

### 🧭 Navigation
- [ ] Role-conditional navbar links (Reader / Author / Admin)
- [ ] Global search bar with debounced query
- [ ] GET `/api/novels/search?q=` — search by title and author name

### 📚 Novel Module
- [ ] Novel creation form (title, synopsis, covers, genres)
- [ ] POST `/api/novels` — create novel, validate fields, store
- [ ] Rich text chapter editor (bold, italic, underline)
- [ ] Auto-save draft every 30 seconds
- [ ] POST `/api/novels/:id/chapters` — save chapter content
- [ ] POST `/api/chapters/:id/publish` — submit chapter to admin queue
- [ ] Novel profile page — cover, metadata, chapter list, rating
- [ ] GET `/api/novels/:id` — fetch novel with chapters and rating
- [ ] Star rating widget
- [ ] POST `/api/novels/:id/rating` — submit/update user rating
- [ ] Chapter comment section (end of chapter)
- [ ] POST `/api/chapters/:id/comments` — post comment
- [ ] GET `/api/chapters/:id/comments` — fetch comments
- [ ] Reading history — save + resume position
- [ ] POST `/api/reading-history` — save chapter + paragraph index
- [ ] GET `/api/reading-history` — fetch user's history
- [ ] Homepage sections (Top Rated, Top Views, New, History, Recommended)
- [ ] Mature content CSS blur + age gate

### 📖 Immersive Reader (NLP)
- [ ] Paragraph splitter utility (≤ 200 words, sentence-boundary aware)
- [ ] Store paragraph blocks with index in database at chapter publish
- [ ] Paragraph slide UI (Next.js component) with left/right arrows
- [ ] Swipe gesture support (`react-swipeable` or native touch)
- [ ] Paragraph position save on slide change (debounced API call)
- [ ] Paragraph position restore on chapter load
- [ ] Fetch paragraph emotion from DB on each slide render
- [ ] 5-second dwell timer (reset on navigation, trigger environment on completion)
- [ ] Immersive environment layer (audio overlay component)
- [ ] Emotion → environment mapping (8 emotions)
- [ ] 3-second fade-out + full teardown on environment transition
- [ ] Memory leak prevention: remove DOM nodes, release AudioContext, clear event listeners

### 🐍 Python NLP Pipeline
- [ ] NLP model setup (e.g. `transformers` with emotion classification model)
- [ ] Per-paragraph emotion scoring — pick highest confidence label → map to 8 simplified labels
- [ ] Extract chapter-level: dominantEmotion, secondaryEmotion, genres, tags
- [ ] Async job trigger on chapter publish (job queue integration)
- [ ] Store results to database (paragraph_emotions table, chapter_nlp_metadata table)

### 🤖 Recommendation Engine
- [ ] User behavior tracking (reading events → `user_reading_events` table)
- [ ] User preference profile aggregation (background job or on-demand)
- [ ] GET `/api/recommendations` — query novels by genre/emotion/tag match, exclude read novels

### 🛡️ Admin Module
- [ ] Admin manuscript review queue page (`/admin/manuscripts`)
- [ ] GET `/api/admin/manuscripts` — list pending manuscripts
- [ ] POST `/api/admin/manuscripts/:id/approve`
- [ ] POST `/api/admin/manuscripts/:id/reject` — with rejection letter, notify author
- [ ] Admin mature content review queue (`/admin/mature-review`)
- [ ] POST `/api/admin/novels/:id/validate-mature`
- [ ] POST `/api/admin/novels/:id/reject-mature`
- [ ] Admin novel profile + deactivate/reactivate
- [ ] POST `/api/admin/novels/:id/deactivate`
- [ ] POST `/api/admin/novels/:id/reactivate`
- [ ] Admin dashboard (`/admin/dashboard`) — summary cards, bar chart (genres), top 20 table
- [ ] GET `/api/admin/analytics` — aggregate stats
- [ ] SweetAlert2 integration for deactivation/reactivation confirmations
- [ ] Admin audit log — write log entry on every admin action

### 🗄️ Database Tables (MySQL using phpMyAdmin)
- [ ] `users` (id, username, email, password_hash, role, dob, profile_image, is_active, created_at)
- [ ] `novels` (id, author_id, title, synopsis, cover_image, title_image, is_mature, is_active, view_count, created_at)
- [ ] `novel_genres` (novel_id, genre)
- [ ] `chapters` (id, novel_id, title, content, status, order_index, created_at)
- [ ] `paragraph_blocks` (id, chapter_id, content, word_count, block_index)
- [ ] `paragraph_emotions` (paragraph_block_id, emotion_label, confidence_score)
- [ ] `chapter_nlp_metadata` (chapter_id, dominant_emotion, secondary_emotion, genres[], tags[])
- [ ] `ratings` (id, user_id, novel_id, score, created_at)
- [ ] `comments` (id, user_id, chapter_id, content, created_at)
- [ ] `reading_history` (id, user_id, novel_id, chapter_id, paragraph_index, last_read_at)
- [ ] `user_reading_events` (id, user_id, novel_id, chapter_id, duration_seconds, emotions_encountered[], created_at)
- [ ] `user_preference_profiles` (user_id, favorite_genres[], favorite_emotion, read_novel_ids[], updated_at)
- [ ] `manuscript_reviews` (id, chapter_id, admin_id, action, rejection_reason, reviewed_at)
- [ ] `audit_logs` (id, admin_id, action, target_type, target_id, created_at)
- [ ] `password_reset_tokens` (id, user_id, token_hash, expires_at, used_at)
