# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased] — Phase 1 In Progress

### Added
- `server/` — Standalone Express.js API service (App Tier)
  - JWT authentication (`/api/auth/*`) with bcrypt password hashing
  - 13 Mongoose models mapping all Firestore collections to MongoDB schemas
  - 14 route modules covering 40+ endpoints
  - `helmet` — HTTP security headers
  - `express-rate-limit` — 20 req/15min on auth, 200 req/min on general API
  - `morgan` — structured HTTP request logging
  - Environment variable validation on startup (`server/config/env.js`)
- `scripts/migrate-firebase-to-mongo.js` — Full Firestore → MongoDB data migration script
- `docs/adr/` — Architecture Decision Records
  - ADR-001: MongoDB over Firebase Firestore
  - ADR-002: JWT over Firebase Auth
  - ADR-003: Express API tier separation
- `docs/blog-drafts/` — Jekyll blog post drafts and LinkedIn post templates
- `.env.example` — Documents all required and optional environment variables

### Changed
- `jsconfig.json` — Fixed: removed incompatible `baseUrl` for `moduleResolution: bundler`; added JSX support, Next.js plugin, proper `include`
- `data/admin.json` — Removed plaintext password field (security)
- `README.md` — Rewritten to reflect DevSecOps migration project goals and architecture
- `.gitignore` — Added `.cursor/`, Terraform state file patterns

### Removed
- `.cursor/` — Cursor IDE artifacts (not relevant to project)
- `TEAM_SYNC_INSTRUCTIONS.md` — Team-only document (solo project now)
- `temp_imports.txt` — Throwaway file
- `__tests__/` — Broken test files (Jest not installed; replaced by proper test setup in Phase 3)
- 17 Firebase-specific and team-only docs from `docs/` (Firebase setup guides, team setup, contributing guide)

---

## [0.1.0] — Original Team Project

### Context
Built by a 7-person team at Universiti Teknologi Malaysia (UTM) as a final-year Application Development course project. Stack: Next.js 14, Firebase Auth, Firebase Firestore, Tailwind CSS, Google Gemini AI.

### Features Delivered
- Firebase Auth integration (email/password)
- Role-based access control (student, teacher, admin)
- Course management CRUD
- Module and lesson management
- AI-assisted learning via Gemini (Firebase AI SDK)
- Assessments and progress tracking
- Discussion forum with voting, replies, moderation
- Notification system
- Admin dashboard
- Analytics and weak-area detection
