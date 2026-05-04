# LinkedIn Post — Phase 3: Terraform + AWS Infrastructure

*Post this: After you run terraform apply and have the ALB DNS name*
*This is post #5 in the series. The Phase 1 networking post already described the VPC architecture —*
*this post covers turning that architecture into code. Don't repeat the VPC/subnet description.*

---

## Draft

---

Phase 3 of my MindCraft migration is done. The AWS infrastructure I described in Phase 1 is now code.

```bash
terraform apply
```

47 resources. ~4 minutes. Reproducible every time.

The interesting part isn't what Terraform provisions — I already covered the architecture.
The interesting part is what treating infrastructure as code actually changes.

**It makes destruction safe.**

```bash
terraform destroy   # everything gone, charges stop
terraform apply     # same infrastructure, back in 4 minutes
```

When you're a student running demos on your own AWS account, this matters.
I can run the full 3-tier stack for a demo, tear it down the same day, and pay
for ~4 hours of EC2 instead of a month.

**It forced me to think in modules.**

```
modules/
  vpc/    → outputs: vpc_id, subnet_ids
  sg/     → inputs: vpc_id  | outputs: sg_ids
  ec2/    → inputs: subnet_ids, sg_ids
  alb/    → inputs: vpc_id, subnet_ids, web_instance_id
```

Each module outputs exactly what the next one needs. The dependency chain is
explicit in the code, not in a README or someone's memory.

**It removed SSH entirely.**

No key pairs. No port 22. No bastion host. EC2 instances are accessed via
AWS Systems Manager Session Manager:

```bash
aws ssm start-session --target i-0abc123...
```

SSM uses the instance's IAM role for auth. No keys to manage, rotate, or accidentally
commit. This was a deliberate security decision — the attack surface for remote access
is the IAM policy, not a private key file.

Remote state lives in S3 with DynamoDB locking so the state file can't get corrupted
if two apply runs happen at the same time.

Phase 4 is GitHub Actions — automated build, container scan, and deploy to these
EC2 instances on every push to main.

[Live URL: ___________________________]

Source: github.com/Mhdomer/mindcraft-aws-migration

---

*Hashtags: #Terraform #AWS #DevSecOps #InfrastructureAsCode #CloudEngineering #OpenToWork*

---

## Attachment options

**Option A (recommended) — terraform apply terminal output**
Screenshot of the final lines:
```
Apply complete! Resources: 50 added, 0 changed, 0 destroyed.

Outputs:
alb_dns_name = "mindcraft-alb-xxxxxxxx.ap-southeast-1.elb.amazonaws.com"
```
Dark terminal, real output. This is your proof of work.

**Option B — Terraform module tree diagram**
```
main.tf
  └── vpc      → outputs: vpc_id, subnet_ids
  └── sg       → inputs: vpc_id | outputs: sg_ids
  └── ec2      → inputs: subnet_ids, sg_ids
  └── alb      → inputs: vpc_id, subnet_ids, sg_alb_id, web_instance_id
  └── cloudwatch → inputs: instance_ids
```
Shows you understand IaC module composition, not just "I ran terraform apply."

---

## What changed from the original draft

Removed the VPC/subnet/Security Group description — the Phase 1 networking post
already covered the architecture. This version leads with the IaC value: reproducibility,
destroy-apply workflow, module composition, and SSM over SSH. Those are the new angles.
