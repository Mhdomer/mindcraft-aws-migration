# MindCraft — Secure 3-Tier Cloud Migration & DevSecOps Pipeline


![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat-square&logo=next.js&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-ffca28?style=flat-square&logo=firebase&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=flat-square&logo=terraform&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-FF9900?style=flat-square&logo=amazonaws&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-4fb325?style=flat-square)

---

## What is this?

MindCraft is an **AI-powered learning platform** for secondary school students, originally built as a final-year Application Development course project at Universiti Teknologi Malaysia (UTM). The platform includes course management, AI-assisted learning (Gemini), assessments, progress tracking, and a discussion forum.

This repository is my **solo extension** of that project — taking the working application and migrating it into a production-grade, cloud-native deployment on AWS to demonstrate real-world **DevSecOps** and **Infrastructure as Code** skills.

---

## What This Project Demonstrates

| Skill Area | Implementation |
|---|---|
| Infrastructure as Code | Terraform — VPC, EC2, ALB, Security Groups, NAT Gateway |
| Containerization | Docker multi-stage builds, Docker Compose |
| CI/CD Pipeline | GitHub Actions — build, test, security scan, deploy |
| Security Scanning | Trivy (container CVE scanning), SonarCloud (SAST) |
| Network Security | 3-tier VPC with least-privilege Security Groups |
| Observability | AWS CloudWatch — logs, metrics, alarms |
| Linux / Cloud | Ubuntu EC2 instances, SSM access (no SSH keys) |

---

## Target Architecture

```
                        Internet
                            │
                       [ALB - Public]
                            │
              ┌─────────────┴─────────────┐
              │         Public Subnets     │
              │   [EC2: Nginx + Next.js]   │
              │       (Web Tier)           │
              └─────────────┬─────────────┘
                            │ port 3001 (internal)
              ┌─────────────┴─────────────┐
              │        Private Subnets     │
              │    [EC2: Express API]      │
              │       (App Tier)           │
              └─────────────┬─────────────┘
                            │ port 27017 (internal)
              ┌─────────────┴─────────────┐
              │        Private Subnets     │
              │      [EC2: MongoDB]        │
              │       (DB Tier)            │
              └───────────────────────────┘
                            │
                      [NAT Gateway]
                   (outbound only — updates)
```

**VPC:** `10.0.0.0/16` across 2 Availability Zones
**Subnets:** 2 public (Web + ALB) · 2 private (App) · 2 private (DB)

---

## Application Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TailwindCSS |
| Backend | Next.js API Routes → migrating to standalone Express |
| AI | Google Gemini API |
| Database | Firebase Firestore → migrating to MongoDB on AWS EC2 |
| Auth | Firebase Authentication (retained) |

---

## Project Phases

| Phase | Goal | Status |
|---|---|---|
| **Phase 0** | App stabilization — build passes, all features verified | In Progress |
| **Phase 1** | Docker — containerize frontend, API, MongoDB via Compose | Planned |
| **Phase 2** | Terraform — provision full AWS 3-tier infrastructure | Planned |
| **Phase 3** | GitHub Actions — CI/CD with Trivy + SonarCloud security gates | Planned |
| **Phase 4** | CloudWatch observability + security hardening | Planned |

Full details in [docs/PRD_DEVSECOPS_MIGRATION.md](docs/PRD_DEVSECOPS_MIGRATION.md).

---

## Running Locally (Current — Phase 0)

```bash
git clone https://github.com/Mhdomer/MindCraft.git
cd MindCraft
npm install

# Add your environment variables
cp .env.example .env.local   # fill in Firebase + Gemini keys

npm run dev
# → http://localhost:3000
```

> **Phase 1 (coming):** `docker compose up` will run the full stack locally against MongoDB.

---

## Repository Structure

```
MindCraft/
├── app/                    # Next.js App Router pages
├── components/             # Shared UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
├── data/                   # Sample/seed data
├── scripts/                # Migration and utility scripts
├── docs/                   # Architecture docs and PRD
│   └── PRD_DEVSECOPS_MIGRATION.md
├── terraform/              # (Phase 2) AWS Infrastructure as Code
├── .github/workflows/      # (Phase 3) CI/CD pipeline definitions
├── Dockerfile.frontend     # (Phase 1) Next.js container
├── Dockerfile.api          # (Phase 1) Express API container
└── docker-compose.yml      # (Phase 1) Local full-stack setup
```

---

## Original Project

MindCraft was built by a team of 7 students at UTM as part of the Application Development course. This solo extension demonstrates infrastructure and DevSecOps skills beyond the scope of the original coursework.

---

*Built by Mohamed Omar Makhlouf — Computer Science, Universiti Teknologi Malaysia*
