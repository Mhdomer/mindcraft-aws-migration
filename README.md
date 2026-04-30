<div align="center">

# MindCraft

**AI-powered learning platform — migrated from Firebase to a self-managed 3-tier AWS architecture**

[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![Express](https://img.shields.io/badge/Express-404D59?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=for-the-badge&logo=terraform&logoColor=white)](https://terraform.io)
[![AWS](https://img.shields.io/badge/AWS-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/features/actions)

![CI](https://github.com/Mhdomer/mindcraft-aws-migration/actions/workflows/ci.yml/badge.svg)
![Security Scan](https://github.com/Mhdomer/mindcraft-aws-migration/actions/workflows/security.yml/badge.svg)
![Deploy](https://github.com/Mhdomer/mindcraft-aws-migration/actions/workflows/deploy.yml/badge.svg)

</div>

---

## Overview

MindCraft is an AI-powered learning platform for secondary school students — originally built by a team of 7 at **Universiti Teknologi Malaysia (UTM)** using Next.js + Firebase.

This repository is my **solo extension**: taking the working application and re-architecting it into a production-grade, fully self-managed **3-tier deployment on AWS** to demonstrate real DevSecOps and cloud infrastructure skills.

> Firebase hides everything below the application layer. To prove you can manage infrastructure, you need to own the database tier yourself.

---

## AWS Architecture

<!-- Architecture diagram — replace this comment with your exported image -->
<!-- ![Architecture](docs/architecture.png) -->

**Security Group Rules (Least Privilege)**

| Source | Destination | Port | Why |
|---|---|---|---|
| Internet | ALB | 443 | HTTPS inbound only |
| ALB SG | Web Tier SG | 3000 | ALB → Next.js |
| Web Tier SG | App Tier SG | 3001 | Frontend → Express API |
| App Tier SG | DB Tier SG | 27017 | API → MongoDB only |
| App + Web SGs | NAT Gateway | 443 | Outbound updates |

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14, React 18, TailwindCSS | App Router, standalone Docker output |
| Backend | Express.js + Node.js | Standalone API, port 3001 |
| Database | MongoDB + Mongoose | 13 schemas, private subnet EC2 |
| Auth | JWT + bcrypt, httpOnly cookies | Replaces Firebase Auth |
| AI | Google Gemini API | Proxied server-side — key never reaches browser |
| Infra | Terraform + AWS EC2, VPC, ALB | 35 resources, apply/destroy verified |
| CI/CD | GitHub Actions + Amazon ECR | Trivy CVE scan → ECR push → SSM deploy |
| Observability | AWS CloudWatch | Logs, metrics, alarms — Phase 4 |

---

## Project Phases

| Phase | Goal | Status |
|---|---|---|
| **Phase 0** | App stabilization — fix build, clean repo, verify all routes | ✅ Complete |
| **Phase 1** | Express API + MongoDB + JWT auth + full Firebase removal | ✅ Complete |
| **Phase 2** | Docker — multi-stage builds, Docker Compose full-stack | ✅ Complete |
| **Phase 3** | Terraform — VPC, EC2, ALB, Security Groups, S3 remote state | ✅ Complete |
| **Phase 4** | GitHub Actions — Trivy CVE scan → ECR push → SSM deploy | ✅ Complete |
| **Phase 5** | CloudWatch observability + Secrets Manager + HTTPS | 🔄 In Progress |

Full details: [docs/PRD_DEVSECOPS_MIGRATION.md](docs/PRD_DEVSECOPS_MIGRATION.md)

---

## What Phase 1 Replaced

| Before (Firebase) | After (Self-managed) |
|---|---|
| `onAuthStateChanged` | JWT in `httpOnly` cookie, 24h expiry, bcrypt(12) |
| `onSnapshot` real-time listeners | REST polling via centralized `lib/api.js` |
| `getDoc` / `addDoc` / `updateDoc` | Mongoose models + Express REST endpoints |
| Next.js API Routes (16 Firebase handlers) | Standalone Express service — 14 modules, 40+ endpoints |
| Google managing the DB tier | EC2 instance with Security Group isolation on port 27017 |

---

## Running Locally

### Option 1 — Direct

```bash
git clone https://github.com/Mhdomer/mindcraft-aws-migration.git
cd mindcraft-aws-migration

# 1. Frontend
npm install
# create .env with NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev                    # → http://localhost:3000

# 2. API (separate terminal)
cd server
# create server/.env with MONGODB_URI and JWT_SECRET
npm install
npm run dev                    # → http://localhost:3001
```

### Option 2 — Docker Compose (Phase 2)

```bash
cp .env.example .env           # set JWT_SECRET and GEMINI_API_KEY
docker compose up
# → http://localhost:3000
```

### Seed test accounts

Use the `/api/auth/register` endpoint with a `role` field set to `admin`, `teacher`, or `student`.
See [docs/PRD_DEVSECOPS_MIGRATION.md](docs/PRD_DEVSECOPS_MIGRATION.md) for details.

---

## Repository Structure

```
mindcraft-aws-migration/
├── app/                    # Next.js App Router — pages and layouts
├── components/             # Shared React components
├── lib/                    # api.js fetch wrapper, utilities
├── server/                 # Standalone Express API
│   ├── models/             # 13 Mongoose schemas
│   ├── routes/             # 14 route modules
│   ├── middleware/         # JWT requireAuth, requireRole
│   └── config/             # DB connection, env validation
├── scripts/                # Firebase → MongoDB migration script
├── docs/                   # PRD, ADRs, architecture docs
├── terraform/              # Phase 3 — AWS IaC (apply/destroy verified)
├── .github/workflows/      # Phase 4 — CI/CD pipeline (ci, security, deploy)
├── Dockerfile.frontend     # Multi-stage Next.js container
├── Dockerfile.api          # Multi-stage Express API container
└── docker-compose.yml      # Full-stack local orchestration
```

---

## Why Not Keep Firebase?

Firebase is a managed BaaS — Google owns and operates the infrastructure below the application layer. There are no Security Groups to configure, no private subnets to design, no Linux server to administer.

MongoDB on EC2 requires configuring the Security Group rule that restricts port 27017 to the App Tier only, managing EBS snapshots, storing the connection string in AWS Secrets Manager, and keeping the OS patched. That work is visible in interviews. Firebase work is not.

---

## Original Project

Built by a team of 7 UTM students — Application Development course, 2025.
This solo extension is independent DevSecOps portfolio work.

---

<div align="center">

**Mohamed Omar Makhlouf** · CS, Universiti Teknologi Malaysia

[![GitHub](https://img.shields.io/badge/GitHub-Mhdomer-181717?style=flat-square&logo=github)](https://github.com/Mhdomer)

</div>
