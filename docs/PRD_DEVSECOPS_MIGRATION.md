# MindCraft — Secure 3-Tier Cloud Migration & DevSecOps Pipeline
## Product Requirements Document (PRD)

**Author:** Mohamed Omar Makhlouf (Mhdomer)
**Date:** 2026-04-16
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

To build a genuine 3-tier architecture, the database layer must be self-managed on AWS. The chosen strategy:

| Concern | Decision | Reason |
|---|---|---|
| Auth | **Keep Firebase Auth** | Complex to replace; not the focus of this project |
| Database | **Migrate Firestore → MongoDB on AWS EC2** | Enables true DB tier, matches DevSecOps portfolio goal |
| Backend | **Extract API Routes → Standalone Express service** | Clean tier separation, independently scalable |
| Frontend | **Next.js → Dockerized, served via Nginx on EC2** | Standard production pattern |
| AI | **Keep Gemini API** | External managed service, no infra cost |

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
**Status:** In Progress

#### Tasks:
- [ ] Add `.env.local` with all required Firebase + Gemini keys
- [ ] Verify all existing features run locally (`npm run dev`)
- [ ] Fix known issues: student submissions (listed as in-progress in README)
- [ ] Complete AI features (Gemini integration already installed)
- [ ] Complete discussion forum (`/forum` route exists, verify functionality)
- [ ] Run `npm audit fix` to address the 25 known vulnerabilities
- [ ] Ensure `npm run build` passes with zero errors (required before Docker)

**Exit Criteria:** `npm run build` succeeds. All main routes load without errors.

---

### Phase 1 — Containerization (Docker)
**Goal:** Package the entire application stack into Docker containers that mirror production.
**Status:** Planned

#### 1.1 — Next.js Frontend Dockerfile
- Multi-stage build: `node:20-alpine` builder → `node:20-alpine` runner
- Copy only production build output (`.next/standalone`)
- Expose port `3000`
- Non-root user for security

#### 1.2 — Express API Dockerfile (new service)
- Extract Next.js API Routes into a standalone `server/` Express app
- Multi-stage build: builder → slim runner
- Expose port `3001`
- Non-root user

#### 1.3 — MongoDB Dockerfile / Compose Service
- Use official `mongo:7` image
- Volume mount for data persistence
- Restricted to internal network only (no published ports)

#### 1.4 — Docker Compose (local dev + testing)
```
services: frontend, api, mongodb
networks: frontend-net (web↔api), backend-net (api↔db)
```
- `.env` file driven — no secrets hardcoded in Compose file
- Health checks on all services

#### 1.5 — Data Migration Script
- Write a script to export Firestore collections → seed MongoDB
- Collections to migrate: `users`, `courses`, `progress`, `assessments`, `submissions`, `forum`

**Exit Criteria:** `docker compose up` runs the full stack locally. All features work against MongoDB instead of Firestore.

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

| Phase | Milestone | Notes |
|---|---|---|
| Phase 0 | App runs locally, build passes | Required before all else |
| Phase 1 | `docker compose up` works end-to-end | MongoDB replaces Firestore |
| Phase 2 | Terraform provisions VPC + EC2 | App manually deployed to verify |
| Phase 3 | CI/CD pipeline fully automated | Green badge on README |
| Phase 4 | CloudWatch live, security hardened | Portfolio-ready state |

---

## 9. Out of Scope

- Kubernetes / EKS (not needed at this scale, adds complexity without portfolio value over Docker)
- Multi-region deployment
- Replacing Firebase Auth (high effort, low portfolio value)
- Mobile app

---

*This document is the single source of truth for project direction. Update phase statuses here as work progresses.*
