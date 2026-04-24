# MindCraft — Secure 3-Tier Cloud Migration & DevSecOps Pipeline
## Product Requirements Document (PRD)

**Author:** Mohamed Omar Makhlouf (Mhdomer)
**Date:** 2026-04-19
**Repo:** https://github.com/Mhdomer/MindCraft
**Status:** Active — Personal portfolio extension of team project

---

## 1. Project Context

MindCraft is an AI-powered learning platform built for secondary school students, developed as a final-year application development course project at Universiti Teknologi Malaysia (UTM). The original stack is **Next.js 14 + Firebase (Auth + Firestore)**.

This PRD governs the solo extension of that project into a production-grade, cloud-native deployment using **AWS**, **Docker**, **Terraform**, and a **DevSecOps CI/CD pipeline** — demonstrating real-world infrastructure and security engineering skills.

---

## 2. Actual Tech Stack (Source of Truth)

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TailwindCSS |
| Backend | Next.js API Routes (same process) |
| AI | Google Gemini API (`@google/generative-ai`) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Charts | Recharts, Tremor |
| PDF | jsPDF, html2canvas |

> **Architecture note:** This is NOT a classic MERN app. It is a Next.js monolith using Firebase as a managed backend. The migration plan below accounts for this reality.

---

## 3. Migration Strategy Decision

Firebase is a Backend-as-a-Service (BaaS) — Google manages all the infrastructure. Keeping it means the database and auth still sit on Google's platform, not AWS. A recruiter looking at this project would correctly point out: "you didn't actually manage any infrastructure." The migration replaces Firebase entirely with self-managed services on AWS to demonstrate real DevSecOps skills — Security Group rules for a database, private subnet isolation, secrets management, and Linux server administration — none of which are visible or possible through Firebase.

| Concern | Decision | Reason |
|---|---|---|
| Auth | **Replace Firebase Auth → JWT (JSON Web Tokens)** | Firebase Auth keeps Google in the loop. JWT handled by Express shows you understand secure session management — high resume value for Network Security |
| Database | **Replace Firestore → MongoDB on AWS EC2** | Enables true DB tier: Security Groups, port 27017 isolation, EBS backups, Linux administration |
| Backend | **Extract Next.js API Routes → Standalone Express + Node.js** | Clean App Tier separation; independently deployable and scalable |
| Frontend | **Next.js → Dockerized, served via Nginx on EC2** | Standard production pattern |
| AI | **Keep Gemini API (via Firebase AI SDK)** | External managed service, no infra required — acceptable dependency |

> **Why this matters for interviews:** Firebase hides all networking. MongoDB on EC2 forces you to configure Security Groups ("only App Tier SG can reach DB on 27017"), manage EBS snapshots, and handle connection strings securely via AWS Secrets Manager. That is the story recruiters at cloud and security firms want to hear.

---

## 4. Target Architecture

```
Internet
    │
    ▼
[ALB — Public]
    │
    ├──────────────────────────────────────────────────┐
    │                                                  │
    ▼                                                  │
[Web Tier — Public Subnet]                             │
 EC2: Nginx + Next.js Docker container                 │
 (Port 80/443 inbound from ALB only)                   │
    │                                                  │
    ▼ (Port 3001, internal only)                       │
[App Tier — Private Subnet]                            │
 EC2: Express API Docker container                     │
 (No inbound from internet)                            │
    │                                                  │
    ▼ (Port 27017, internal only)                      │
[DB Tier — Private Subnet]                             │
 EC2: MongoDB Docker container                         │
 (No inbound except from App Tier SG)                  │
    │
[NAT Gateway] → Internet (outbound only, for updates)
```

**VPC Layout:**
- 1 VPC: `10.0.0.0/16`
- 2 Public Subnets (AZ-a, AZ-b): Web Tier + ALB
- 2 Private Subnets (AZ-a, AZ-b): App Tier
- 2 Private Subnets (AZ-a, AZ-b): DB Tier
- 1 NAT Gateway (AZ-a)
- 1 Internet Gateway

---

## 5. Phases

---

### Phase 0 — App Stabilization
**Goal:** Get the existing app fully functional before touching infrastructure.
**Status:** Complete ✅

#### Tasks:
- [x] Add `.env` with all required Firebase + Gemini keys
- [x] Verify all existing features run locally (`npm run dev`) — all main routes 200 OK
- [x] Fix jsconfig.json — removed incompatible `baseUrl` for `moduleResolution: bundler`
- [x] Security audit before first push — removed plaintext password from `data/admin.json`
- [x] Clean project root — removed `.cursor/`, `TEAM_SYNC_INSTRUCTIONS.md`, temp files
- [x] Removed 17 stale Firebase-specific and team-only docs from `docs/`
- [x] Added `.env.example` documenting all required environment variables

**Exit Criteria met:** App runs locally. Build-critical issues fixed. Repo clean and pushed.

---

### Phase 1 — Backend Migration (Express + MongoDB + JWT)
**Goal:** Replace Firebase with a self-managed MERN backend.
**Status:** Complete ✅ — All Firebase removed from frontend and backend. App runs fully on Express + MongoDB + JWT.

#### 1.1 — Express API Service ✅
- Standalone `server/` app on port 3001
- `helmet` security headers, `morgan` request logging
- `express-rate-limit`: 20 req/15min on auth routes, 200 req/min general
- Environment variable validation — fails fast on startup if secrets are missing
- Global error handler — never leaks stack traces to clients in production

#### 1.2 — JWT Authentication ✅
- `/api/auth/register` — bcrypt(12), JWT signed HS256, 24h expiry
- `/api/auth/login` — credential verify, JWT in `httpOnly` secure cookie
- `/api/auth/logout` — clears cookie, marks user offline
- `/api/auth/heartbeat` — keeps presence alive (replaces Firebase onAuthStateChanged)
- `requireAuth` and `requireRole` middleware for all protected routes

#### 1.3 — Mongoose Models ✅
- 13 schemas: User, Course, Module, Lesson, LessonExercise, Enrollment,
  Assignment, Assessment, Submission, Notification, Post, AuditLog, GameLevel
- Indexes on all high-cardinality query fields
- No plain passwords stored anywhere — bcrypt hash only

#### 1.4 — Express Routes ✅
- 14 route modules, 40+ endpoints mirroring original Next.js API routes
- Role-based guards on all mutating operations
- Forum: content policy check, search index build, voting, audit log on delete
- Submission grading: draft → release pattern, notification on release
- AI: Gemini proxied server-side so API key never reaches the browser
- Course DELETE cascades: removes modules, lessons, and enrollments

#### 1.5 — Data Migration Script ✅
- `scripts/migrate-firebase-to-mongo.js`
- Firestore string IDs → MongoDB ObjectIds via consistent in-memory map
- Migrates: users (bcrypt temp password), courses, modules, lessons, enrollments, forum posts, notifications
- Run once after MongoDB is provisioned

#### 1.6 — Frontend Migration (Firebase → Express API) 🔄
Replace all direct Firebase/Firestore calls in Next.js pages with `api.get/post/put/patch/delete` via `lib/api.js`.

**Migrated ✅**
- `app/contexts/AuthContext.jsx` — `onAuthStateChanged` → `/api/auth/me` polling; login/logout via Express
- `hooks/useAuth.js` — re-exports AuthContext (backwards compat)
- `app/assessments/[id]/take/page.jsx` — quiz timer, auto-grade, submit via Express
- `app/assessments/[id]/submit/page.jsx` — assignment submission (text, no Firebase Storage)
- `app/assessments/[id]/submissions/page.jsx` — teacher view of all submissions
- `app/assessments/new/page.jsx` — create assessment with AI generation
- `app/assessments/[id]/edit/page.jsx` — edit/delete assessment
- `app/forum/page.jsx` — list, create, vote, react, pin, lock, delete posts
- `app/forum/[id]/page.jsx` — thread view, replies, accepted answer, resolution status
- `app/admin/courses/page.jsx` — course list with bulk publish/unpublish/delete
- `app/admin/courses/CourseManagement.jsx` — publish/unpublish/delete individual course
- `app/admin/register/page.jsx` — register new teacher/student via Express
- `app/admin/settings/page.jsx` — theme/language only (logo upload removed, no server endpoint)
- `app/admin/users/page.jsx` — list, edit name, delete users

**Remaining ❌**
- `app/dashboard/courses/new/page.jsx`
- `app/dashboard/courses/[id]/edit/page.jsx`
- `app/dashboard/modules/page.jsx`
- `app/dashboard/modules/[id]/page.jsx`
- `app/dashboard/modules/[id]/lessons/[lessonId]/preview/page.jsx`
- `app/courses/[id]/modules/[moduleId]/lessons/[lessonId]/page.jsx` (lesson player)
- `app/components/CourseModuleManager.jsx`
- `app/profile/page.jsx`
- `app/settings/page.jsx`
- `app/progress/page.jsx`

**Completed in Phase 1 (week of 2026-04-21) ✅**
- `app/game-levels/page.jsx` + `new` + `[id]/edit` + `[id]/page.jsx`
- `app/ai/page.jsx` + `coding-help` + `explain`
- `app/submissions/[id]/grade/page.jsx`
- `app/analytics/page.jsx` — major rewrite, ~700 lines of Firestore debug logging removed
- `app/recommendations/page.jsx`
- `app/weak-areas/page.jsx`
- `app/explore/page.jsx` — switched to optionalAuth for public course browse
- `app/debug-data/page.jsx`
- `components/Header.jsx` — dead Firebase imports removed
- `components/NotificationBell.jsx` — Firestore onSnapshot → 30s polling via api.get
- `components/FloatingAIAssistantWrapper.jsx` — full rewrite with useAuth()
- `components/LessonExercise.jsx` — Firebase auth imports removed
- `lib/api.js` — centralized fetch wrapper with credentials:include
- All `app/api/` Next.js route handlers — 16 files deleted (superseded by Express)

#### 1.7 — Next.js Frontend Dockerfile [ ] ← NEXT UP
- Multi-stage build: `node:20-alpine` builder → slim runner
- `.next/standalone` output only — no dev dependencies in image
- Non-root user

#### 1.8 — Express API Dockerfile [ ]
- Multi-stage build: install deps → copy source → run as non-root
- Expose port 3001

#### 1.9 — Docker Compose [ ]
- Services: `frontend` (3000), `api` (3001), `mongodb` (internal only)
- Networks: `frontend-net` (frontend↔api), `backend-net` (api↔mongodb)
- Health checks on all services
- `.env` driven — zero hardcoded secrets

**Exit Criteria:** `docker compose up` runs the full stack. Login/register works via JWT. All features work against MongoDB. Zero Firebase SDK calls remaining in the codebase.

---

### Phase 2 — Infrastructure as Code (Terraform + AWS)
**Goal:** Provision all AWS resources reproducibly via code.
**Status:** Planned

#### 2.1 — Terraform Project Structure
```
terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── modules/
│   ├── vpc/
│   ├── security-groups/
│   ├── ec2/
│   └── alb/
└── environments/
    ├── dev/
    └── prod/
```

#### 2.2 — VPC Module
- VPC, 6 subnets (2 public, 4 private across 2 AZs)
- Internet Gateway, NAT Gateway
- Route Tables

#### 2.3 — Security Groups Module (Least Privilege)
| SG | Inbound | Outbound |
|---|---|---|
| `sg-alb` | 80, 443 from `0.0.0.0/0` | All to `sg-web` |
| `sg-web` | 3000 from `sg-alb` | All to `sg-api` |
| `sg-api` | 3001 from `sg-web` | All to `sg-db` |
| `sg-db` | 27017 from `sg-api` | None |

#### 2.4 — EC2 Module
- Web Tier: `t3.small`, public subnet, Docker installed via User Data
- App Tier: `t3.small`, private subnet, Docker installed via User Data
- DB Tier: `t3.medium`, private subnet, Docker + EBS volume for MongoDB data
- All instances use an IAM Instance Profile with minimal permissions

#### 2.5 — ALB Module
- Application Load Balancer in public subnets
- HTTP → HTTPS redirect (ACM certificate)
- Target Group pointing to Web Tier EC2s

#### 2.6 — State Management
- S3 bucket for Terraform remote state
- DynamoDB table for state locking

#### 2.7 — IAM
- CI/CD runner IAM user: permissions scoped to EC2, S3, ECR only
- EC2 Instance Profile: SSM access (no SSH keys needed), CloudWatch logs

**Exit Criteria:** `terraform apply` provisions the full network. EC2 instances are reachable (web tier via ALB, others via SSM only).

---

### Phase 3 — CI/CD & DevSecOps Pipeline (GitHub Actions)
**Goal:** Automate build, security scanning, and deployment on every push to `main`.
**Status:** Planned

#### Pipeline Stages:
```
Push to main
    │
    ├── [Job 1] Lint & Build
    │     └── npm ci → next build (fails fast on build errors)
    │
    ├── [Job 2] SAST — SonarQube
    │     └── Scan source code for vulnerabilities and code smells
    │
    ├── [Job 3] Docker Build & Trivy Scan
    │     ├── Build frontend image
    │     ├── Build API image
    │     ├── Trivy scan: fail on CRITICAL/HIGH CVEs
    │     └── Push to Amazon ECR (if scans pass)
    │
    └── [Job 4] Deploy to AWS
          ├── SSH/SSM into Web Tier EC2 → docker pull + restart
          └── SSH/SSM into App Tier EC2 → docker pull + restart
```

#### 3.1 — GitHub Actions Workflow Files
- `.github/workflows/ci.yml` — Lint, build, test
- `.github/workflows/security.yml` — Trivy + SonarQube
- `.github/workflows/deploy.yml` — ECR push + EC2 deploy (triggered on `main` only)

#### 3.2 — GitHub Secrets Required
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
ECR_REGISTRY
SONAR_TOKEN
SONAR_HOST_URL
```

#### 3.3 — SonarQube Setup
- Self-hosted on a `t3.small` EC2 (outside the 3 main tiers)
- Or use SonarCloud (free for public repos — recommended for portfolio)

#### 3.4 — Trivy Configuration
- `.trivyignore` for accepted/false-positive CVEs (documented with justification)
- Fail pipeline on `CRITICAL` severity by default

**Exit Criteria:** A push to `main` triggers the full pipeline. Docker images are scanned. Deployment to EC2 is automated. Pipeline badge shows green in README.

---

### Phase 4 — Observability & Hardening
**Goal:** Production-grade monitoring and final security hardening.
**Status:** Planned (Post Phase 3)

#### 4.1 — CloudWatch
- CloudWatch Agent on all EC2 instances
- Log groups: `/mindcraft/web`, `/mindcraft/api`, `/mindcraft/mongodb`
- Dashboard: CPU, Memory, Disk, HTTP 5xx error rate
- Alarms: CPU > 80%, disk > 85%, 5xx > threshold → SNS email notification

#### 4.2 — Application-Level Logging
- Structured JSON logging in the Express API (`winston` or `pino`)
- Request/response logging with request IDs
- Error logging with stack traces (never to stdout in prod)

#### 4.3 — Security Hardening Checklist
- [ ] All secrets in AWS Secrets Manager (not EC2 environment variables)
- [ ] MongoDB authentication enabled, no `--noauth`
- [ ] HTTPS enforced via ALB (no plain HTTP to EC2)
- [ ] Security Group audit: zero `0.0.0.0/0` inbound except ALB port 443
- [ ] MongoDB daily snapshots via EBS Snapshot lifecycle policy
- [ ] `npm audit` — zero HIGH/CRITICAL in production dependencies

**Exit Criteria:** CloudWatch dashboard live. All security checklist items checked. Architecture diagram updated.

---

## 6. Repository Structure (Target)

```
MindCraft/
├── app/                      # Next.js App Router pages
├── components/               # Shared UI components
├── server/                   # NEW: Extracted Express API
│   ├── routes/
│   ├── models/               # Mongoose models (MongoDB)
│   ├── middleware/
│   └── index.js
├── scripts/
│   ├── firestore-to-mongo.js # NEW: Data migration script
│   └── ...existing scripts
├── terraform/                # NEW: IaC
│   ├── modules/
│   └── environments/
├── .github/
│   └── workflows/            # NEW: CI/CD pipelines
├── Dockerfile.frontend       # NEW
├── Dockerfile.api            # NEW
├── docker-compose.yml        # NEW
├── .trivyignore              # NEW
├── sonar-project.properties  # NEW
├── docs/
│   ├── PRD_DEVSECOPS_MIGRATION.md  ← this file
│   └── ...existing docs
└── README.md                 # Update with new architecture
```

---

## 7. Success Metrics

| Metric | Target |
|---|---|
| Build time (CI) | < 5 minutes |
| Trivy HIGH/CRITICAL CVEs | 0 in production images |
| SonarQube Quality Gate | Pass (A rating) |
| Infrastructure provisioning | `terraform apply` < 10 minutes |
| App uptime | > 99% (CloudWatch alarm within 2 min of downtime) |
| README portfolio quality | Architecture diagram + pipeline badge + demo link |

---

## 8. Milestone Timeline

| Phase | Milestone | Status | Notes |
|---|---|---|---|
| Phase 0 | App runs locally, build passes | ✅ Complete | |
| Phase 1 | `docker compose up` works end-to-end | 🔄 In Progress | Backend done; frontend ~40% migrated |
| Phase 1.6 | All frontend pages off Firebase | 🔄 Active | ~19 pages remaining |
| Phase 1.7–1.9 | Dockerfiles + Compose | ⏳ Blocked on 1.6 | Start after all pages migrated |
| Phase 2 | Terraform provisions VPC + EC2 | 📋 Planned | App manually deployed to verify |
| Phase 3 | CI/CD pipeline fully automated | 📋 Planned | Green badge on README |
| Phase 4 | CloudWatch live, security hardened | 📋 Planned | Portfolio-ready state |

---

## 9. Out of Scope

- Kubernetes / EKS (not needed at this scale, adds complexity without portfolio value over Docker)
- Multi-region deployment
- ~~Replacing Firebase Auth~~ — **Done** (JWT via Express, bcrypt, httpOnly cookies)
- Mobile app

---

*This document is the single source of truth for project direction. Update phase statuses here as work progresses.*
