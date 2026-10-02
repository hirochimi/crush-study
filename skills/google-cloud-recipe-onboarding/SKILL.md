---
name: google-cloud-recipe-onboarding
description: First-project onboarding, account setup, and billing configuration for Google Cloud
user-invocable: true
disable-model-invocation: false
compatibility: "Crush >= 0.1.0, Agent Skills 1.0"
metadata:
  category: google-cloud
  source: google-cloud-developer-plugin
  version: "1.0.0"
---

# Google Cloud Onboarding Recipes

This skill guides you through the first-time setup of a Google Cloud account, project, and billing. Use it when starting fresh on GCP or helping a teammate onboard.

## When to Use

- Creating your first Google Cloud project
- Setting up billing for a new or existing project
- Organizing projects with folders and organization policies
- Enabling required APIs for a new workload
- Setting up budget alerts and cost controls

## Prerequisites

- Google account (personal or Google Workspace)
- Credit card for billing verification (free tier available)
- Domain ownership (for organization setup, optional)

## Step-by-Step Onboarding

### Phase 1: Account & Billing Setup

```bash
# 1. Open Cloud Console
# https://console.cloud.google.com

# 2. Accept Terms of Service
# 3. Add billing account (credit card required for verification)
#    - Free tier: $300 credit for 90 days
#    - Set up budget alerts immediately (see Phase 3)

# 4. Verify billing is linked
gcloud beta billing projects describe YOUR_PROJECT_ID
```

### Phase 2: First Project Creation

```bash
# Option A: Via CLI (recommended for automation)
gcloud projects create MY_FIRST_PROJECT \
  --name="My First Project" \
  --labels=env=dev,owner=me

# Option B: Via Console (UI guided)
# https://console.cloud.google.com/projectcreate

# Set as default
gcloud config set project MY_FIRST_PROJECT
```

### Phase 3: Essential APIs & Budgets

```bash
# Enable commonly needed APIs
gcloud services enable \
  compute.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  monitoring.googleapis.com \
  logging.googleapis.com

# Create budget alert (replace with your amounts)
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Monthly Budget Alert" \
  --budget-filter=projects=MY_FIRST_PROJECT \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0 \
  --calendar-period=MONTH \
  --amount=100USD
```

### Phase 4: Organization & Folder Structure (Teams)

```bash
# Requires Google Workspace / Cloud Identity
# Create folder for environment isolation
gcloud resource-manager folders create \
  --display-name="Development" \
  --organization=ORG_ID

gcloud resource-manager folders create \
  --display-name="Production" \
  --organization=ORG_ID

# Move project into folder
gcloud projects move MY_FIRST_PROJECT \
  --folder=DEV_FOLDER_ID
```

### Phase 5: Security Foundations

```bash
# Enable Organization Policy constraints (if using folders/org)
gcloud org-policies set-policy \
  --folder=DEV_FOLDER_ID \
  policy.yaml

# Example policy: restrict external IP on VMs
cat > policy.yaml <<'EOF'
constraint: compute.vmExternalIpAccess
listPolicy:
  deny:
    values:
      - '*'
EOF

# Set up Security Command Center (free tier)
gcloud scc settings update \
  --organization=ORG_ID \
  --enable-all-services
```

## Project Structure Templates

### Minimal (Personal / Learning)
```
my-project/
├── .crushrc.local          # This config
├── main.tf                 # Optional: Terraform
└── README.md
```

### Team Standard (Recommended)
```
gcp-landing-zone/
├── org-policies/           # Organization policies as code
├── projects/
│   ├── dev-shared/
│   ├── staging-shared/
│   └── prod-shared/
├── networks/               # Shared VPC, peering
├── iam/                    # Custom roles, groups
├── monitoring/             # Dashboards, alerts
└── modules/                # Reusable Terraform modules
```

## Checklist: New Project Ready for Development

- [ ] Project created and set as default
- [ ] Billing linked and budget alerts configured
- [ ] Required APIs enabled
- [ ] ADC configured locally (`gcloud auth application-default login`)
- [ ] IAM: You have `roles/owner` or `roles/editor` on project
- [ ] Organization policies reviewed (if applicable)
- [ ] Cost monitoring: billing export to BigQuery enabled
- [ ] Security Command Center free tier enabled

## Cost Control from Day One

| Control | Command | Frequency |
|---------|---------|-----------|
| Budget alert | `gcloud billing budgets create` | Once per project |
| Billing export | `gcloud billing projects link` + BigQuery | Once |
| Labels for cost allocation | `gcloud projects update --labels=...` | Per resource |
| Recommender API | `gcloud recommender insights list` | Weekly review |

## Common Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Forgot to enable billing | Budget alert creation fails; do this first |
| Used personal project for team work | Create project under organization/folder |
| No budget alerts | Surprise bills; always set 50%/90%/100% thresholds |
| Enabled all APIs blindly | Larger attack surface; enable as needed |
| No labels on resources | Cannot allocate costs; enforce label policy |

## Related Skills

- `google-cloud-recipe-auth` — Authentication setup
- `gcloud` — CLI safety guardrails
- `finding-google-skills` — Discover specialized skills
- `retrieving-developer-knowledge` — Official onboarding docs