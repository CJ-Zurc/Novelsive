# Novelsive API Reference

## Authentication Endpoints

### POST /api/auth/register
Register a new user with role, email, password, DOB.
```json
Request:
{
  "username": "string",
  "email": "string",
  "password": "string (8+ chars, 1 uppercase, 1 number, 1 special)",
  "dob": "YYYY-MM-DD",
  "role": "READER|AUTHOR",
  "profile_image": "URL (optional)",
  "captcha_token": "string"
}

Response 201:
{
  "user": { "id", "username", "email", "role", "created_at" }
}
```

### POST /api/auth/login
Login and receive JWT in httpOnly cookie.
```json
Request:
{
  "email": "string",
  "password": "string"
}

Response 200:
{
  "user": { "id", "username", "role" }
}
```

### POST /api/auth/logout
Logout and clear session.

---

## Novel Endpoints

### POST /api/novels
Create a new novel (Author+).
```json
Request:
{
  "title": "string",
  "synopsis": "string",
  "cover_image": "URL",
  "title_image": "URL",
  "genres": ["string"],
  "is_mature": "boolean"
}

Response 201:
{
  "novel": { "id", "title", "author_id", "is_active" }
}
```

### GET /api/novels?type=my-novels
Fetch user's novels (Author+) or public novels (all).

### GET /api/novels/:id
Fetch novel profile with chapters.

### POST /api/novels/:id/rating
Rate a novel (1-5 stars).
```json
Request:
{
  "score": "1|2|3|4|5"
}
```

---

## Chapter Endpoints

### POST /api/novels/:id/chapters
Create chapter (Author+).
```json
Request:
{
  "title": "string",
  "content": "HTML|Markdown"
}

Response 201:
{
  "chapter": { "id", "novel_id", "status": "DRAFT" }
}
```

### PATCH /api/chapters/:id
Update chapter draft (Author+).
```json
Request:
{
  "title": "string",
  "content": "string"
}
```

### POST /api/chapters/:id/publish
Submit chapter to admin review (Author+).
Sets chapter status to "PENDING".

### GET /api/chapters/:id/read
Fetch chapter with paragraph blocks and emotions (Reader+).
```json
Response:
{
  "chapter": { ... },
  "blocks": [
    { "id", "content", "emotion": { "emotion_label" } }
  ]
}
```

---

## Comments Endpoints

### POST /api/chapters/:id/comments
Post comment on chapter (authenticated).
```json
Request:
{
  "content": "string"
}
```

### GET /api/chapters/:id/comments
Fetch chapter comments.

---

## Reading History Endpoints

### POST /api/reading-history
Save reading position (auto-called on slide change).
```json
Request:
{
  "novel_id": "integer",
  "chapter_id": "integer",
  "paragraph_index": "integer"
}
```

### GET /api/reading-history
Fetch user's reading history.

---

## Recommendations Endpoints

### GET /api/recommendations
Fetch personalized novel recommendations (Reader+).
Excludes already-read novels, returns top 20 by popularity.

---

## Admin Endpoints (Admin+ role)

### GET /api/admin/users
List all users.

### GET /api/admin/novels
List all novels.

### GET /api/admin/manuscripts
List chapters pending review (status="PENDING").

### POST /api/admin/manuscripts/:id/approve
Approve and publish manuscript.
Sets chapter status to "PUBLISHED".

### POST /api/admin/manuscripts/:id/reject
Reject manuscript with reason.
```json
Request:
{
  "rejection_title": "string",
  "rejection_reason": "string"
}

Sets chapter status to "REJECTED" and notifies author.
```

### POST /api/admin/novels/:id/deactivate
Hide novel from all users.

### POST /api/admin/novels/:id/reactivate
Restore hidden novel.

### GET /api/admin/analytics
Fetch platform analytics (summary, top novels, genre stats).

---

## User Behavior Endpoints (Internal)

### POST /api/user-behavior/track-reading
Record reading session for analytics (called internally).
```json
Request:
{
  "novel_id": "integer",
  "chapter_id": "integer",
  "duration_seconds": "integer",
  "emotions_encountered": ["string"]
}
```

---

## Home & Discovery Endpoints

### GET /api/home
Fetch homepage data: top viewed, top rated, newly updated, reading history.

---

## Error Response Format
```json
{
  "message": "string",
  "code": "ERROR_CODE (optional)"
}
```

## Rate Limits
- Login: 5 attempts per 15 minutes per IP
- General APIs: No explicit limit (add as needed)

## Authentication
All endpoints except `/register`, `/login`, `/forgot-password` require:
- JWT in `httpOnly` cookie named `token`
- RBAC middleware checks role for protected routes

---

**Last Updated:** 2026-05-25
