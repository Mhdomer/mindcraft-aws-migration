# MindCraft — Workflow & Runbook

How the two systems (Terraform + GitHub Actions) relate to each other,
and the exact steps to run for every scenario.

---

## The Big Picture

```
Your Laptop                GitHub                        AWS
──────────────             ──────────────                ──────────────
terraform apply   ──────────────────────────────────►   EC2 + VPC + ALB
                                                         (infrastructure)

git push main     ──────►  GitHub Actions  ──────────►   ECR (images)
                           ci + security                  EC2 (containers)
                           + deploy                       (only if infra up)

terraform destroy ──────────────────────────────────►   everything deleted
                                                         charges stop
```

**Key rule:** Terraform manages infrastructure. GitHub Actions manages the application.
They are independent — one does not trigger the other.

---

## What Persists vs What Resets Each Apply

| Resource | Persists across destroy/apply? | Notes |
|---|---|---|
| Secrets Manager secrets | ✅ Yes | Managed outside Terraform — set once, never touched again |
| MongoDB data (EBS volume) | ❌ No | Volume is destroyed. Data gone unless snapshot restored |
| ECR images | ✅ Yes | Very cheap, ~$0.50/month |
| S3 Terraform state | ✅ Yes | Free tier covers it |
| GitHub Secrets | ✅ Yes | Not AWS, no cost |
| ALB DNS name | ❌ No | Changes every apply — must update 2 GitHub Secrets each time |
| EC2 instance IDs | ❌ No | Changes every apply — but MongoDB IP is pinned (see below) |
| CloudWatch log groups | ❌ No | Deleted by Terraform |

**MongoDB private IP is fixed at `10.0.5.10`** — the DB EC2 instance always gets
this IP, so the `mongodb-uri` secret never needs updating.

---

## One-Time Setup (first apply ever — do this once, never again)

These steps only need to be done **once** across all future apply/destroy cycles.

### A. Populate AWS Secrets Manager

Run from your laptop terminal:

```bash
# JWT secret
aws secretsmanager create-secret \
  --name mindcraft/jwt-secret \
  --secret-string "YOUR_JWT_SECRET_HERE" \
  --region ap-southeast-1

# MongoDB URI — IP is always 10.0.5.10 (pinned in Terraform)
aws secretsmanager create-secret \
  --name mindcraft/mongodb-uri \
  --secret-string "mongodb://10.0.5.10:27017/mindcraft" \
  --region ap-southeast-1

# Gemini API key — from aistudio.google.com
aws secretsmanager create-secret \
  --name mindcraft/gemini-api-key \
  --secret-string "YOUR_GEMINI_KEY_HERE" \
  --region ap-southeast-1
```

> If secrets already exist from a previous session, use `put-secret-value` instead of `create-secret`.
> To verify they exist: `aws secretsmanager list-secrets --region ap-southeast-1 --query "SecretList[].Name"`

### B. Confirm SNS email subscription

After the first `terraform apply`, check `muhamedomar.g@gmail.com` for
"AWS Notification - Subscription Confirmation" from AWS SNS. Click the link.
Only needs to be done once — the subscription persists.

---

## Scenario 1 — Normal Push (no infrastructure running)

Use this when you just want to save code. No AWS charges.

```
Step 1: Write your code
Step 2: git add + commit + push to main
Step 3: GitHub Actions runs automatically
         ├── ci.yml        builds the app ✅ (GitHub's servers, free)
         ├── security.yml  scans images   ✅ (GitHub's servers, free)
         └── deploy.yml    tries to deploy → no instances found → skips ✅
Step 4: Done. Nothing running on AWS.
```

**Cost: ~$0** (ECR stores the built images at ~$0.50/month total)

---

## Scenario 2 — Push Without Triggering Any Workflows

Use this for docs, config changes, or when you want zero workflow runs.

**Option A — Push to a feature branch:**
```bash
git checkout -b your-branch-name
git add .
git commit -m "your message"
git push origin your-branch-name
# Only ci.yml runs (build check only, no ECR push, no deploy)
```

**Option B — Skip CI entirely with a keyword in the commit message:**
```bash
git commit -m "update docs [skip ci]"
git push origin main
# Zero workflows run
```

---

## Scenario 3 — Full Demo (bring everything up)

Use this when you want the app live and accessible.

### Step 1: Run terraform apply

```bash
cd terraform

# Windows — reload PATH first if terraform isn't found
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")

terraform apply -auto-approve
```

Wait ~4 minutes. At the end you'll see:
```
alb_dns_name    = "mindcraft-alb-xxxx.ap-southeast-1.elb.amazonaws.com"
web_instance_id = "i-0abc..."
api_instance_id = "i-0def..."
db_instance_id  = "i-0ghi..."
```

### Step 2: Update the two GitHub Secrets (required every apply — ALB DNS changes)

Go to: **GitHub repo → Settings → Secrets and variables → Actions**

| Secret name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://<alb_dns_name from output>` |
| `FRONTEND_URL` | `http://<alb_dns_name from output>` (same value) |

> AWS Secrets Manager secrets (JWT, MongoDB, Gemini) do **not** need updating —
> they were set once and persist permanently outside of Terraform.

### Step 3: Wait ~10 minutes for EC2 boot

User data installs Docker and the CloudWatch agent on first boot. SSM won't
register the instances until this completes.

Check SSM status:
```bash
aws ssm describe-instance-information \
  --query "InstanceInformationList[].{ID:InstanceId,Status:PingStatus}" \
  --output table --region ap-southeast-1
```
Wait until all three show `Online`.

### Step 4: Start MongoDB on the DB instance

```bash
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --instance-ids <db_instance_id from Step 1> \
  --parameters 'commands=["docker run -d --name mongodb -p 27017:27017 --restart unless-stopped -v /data/mongodb:/data/db mongo:7"]' \
  --region ap-southeast-1
```

### Step 5: Trigger the deploy pipeline

Either push any change to main, or re-run manually:
**GitHub repo → Actions → Deploy → Run workflow → main**

Wait ~3 minutes for the pipeline to complete.

### Step 6: Access the app

Open: `http://<alb_dns_name from Step 1>`

---

## Scenario 4 — Shut Everything Down (stop all charges)

```bash
cd terraform
terraform destroy -auto-approve
```

Wait ~5 minutes. All resources deleted. Charges stop immediately.

**What persists after destroy:**
- ✅ Secrets Manager secrets — **no longer managed by Terraform, untouched**
- ✅ ECR images (~$0.50/month) — delete manually if you want
- ✅ S3 Terraform state file — free tier covers it
- ✅ GitHub Secrets — not AWS, no cost
- ❌ MongoDB data (EBS volume deleted with the instance)
- ❌ CloudWatch log groups — deleted by Terraform

---

## Scenario 5 — Code Change While Infra is Running

```bash
git add .
git commit -m "fix: update API endpoint"
git push origin main
# GitHub Actions runs → builds new images → pushes to ECR
# → SSM pulls new image on EC2 → restarts containers
# App updated automatically, no manual steps
```

---

## Quick Reference Card

| What | Command |
|---|---|
| Check if terraform is in PATH | `terraform --version` |
| Fix "terraform not recognized" | `$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")` |
| Bring infra up | `cd terraform && terraform apply -auto-approve` |
| Tear infra down | `cd terraform && terraform destroy -auto-approve` |
| Check instance SSM status | `aws ssm describe-instance-information --query "InstanceInformationList[].{ID:InstanceId,Status:PingStatus}" --output table --region ap-southeast-1` |
| Check instance health | `aws ec2 describe-instance-status --instance-ids <id> --query "InstanceStatuses[].{System:SystemStatus.Status,Instance:InstanceStatus.Status}" --output table --region ap-southeast-1` |
| Get ALB DNS | `cd terraform && terraform output alb_dns_name` |
| Get all outputs | `cd terraform && terraform output` |
| Verify secrets exist | `aws secretsmanager list-secrets --region ap-southeast-1 --query "SecretList[].Name"` |
| Re-run deploy without a code push | GitHub → Actions → Deploy → Run workflow |
| Run locally | `docker compose up --build` → app at http://localhost:8080 |
