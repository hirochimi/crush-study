---
name: google-cloud-recipe-auth
description: Authentication workflows, credential selection, and service identity best practices for Google Cloud
user-invocable: true
disable-model-invocation: false
compatibility: "Crush >= 0.1.0, Agent Skills 1.0"
metadata:
  category: google-cloud
  source: google-cloud-developer-plugin
  version: "1.0.0"
---

# Google Cloud Authentication Recipes

This skill provides battle-tested authentication patterns for Google Cloud. Use it whenever you need to authenticate to GCP APIs, choose between credential types, or set up service identities.

## When to Use

- Setting up Application Default Credentials (ADC) for local development
- Choosing between user credentials, service accounts, and workload identity
- Configuring CI/CD pipelines with short-lived tokens
- Troubleshooting authentication errors (401, 403, "could not find default credentials")
- Setting up Workload Identity Federation for external identities (GitHub, AWS, etc.)

## Core Principles

### 1. Prefer Application Default Credentials (ADC)
ADC automatically finds credentials in this order:
1. `GOOGLE_APPLICATION_CREDENTIALS` env var (explicit service account key)
2. User credentials from `gcloud auth application-default login`
3. Compute Engine / Cloud Run / GKE metadata server (service account)
4. Workload Identity Federation (external workloads)

### 2. Never Commit Service Account Keys
- Keys are long-lived secrets — avoid creating them
- Use Workload Identity Federation for CI/CD (GitHub Actions, GitLab, etc.)
- Use `gcloud auth application-default login` for local development

### 3. Least Privilege for Service Accounts
- Grant only the roles needed (use `roles/viewer` as starting point)
- Use custom roles for precise permissions
- Regularly audit with `gcloud iam service-accounts get-iam-policy`

## Common Recipes

### Recipe: Local Development Setup
```bash
# 1. Authenticate as yourself (user credentials)
gcloud auth login
gcloud auth application-default login

# 2. Set default project
gcloud config set project YOUR_PROJECT_ID

# 3. Verify ADC works
gcloud auth application-default print-access-token
```

### Recipe: CI/CD with Workload Identity Federation (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
permissions:
  id-token: write  # Required for OIDC token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider
          service_account: deploy-sa@my-project.iam.gserviceaccount.com
      - run: gcloud auth print-access-token  # Works!
```

### Recipe: Service Account for Server-to-Server
```bash
# Create service account
gcloud iam service-accounts create my-service \
  --display-name="My Service" \
  --project=MY_PROJECT

# Grant minimal roles
gcloud projects add-iam-policy-binding MY_PROJECT \
  --member="serviceAccount:my-service@MY_PROJECT.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Download key ONLY if absolutely necessary (e.g., external system)
gcloud iam service-accounts keys create key.json \
  --iam-account=my-service@MY_PROJECT.iam.gserviceaccount.com
```

### Recipe: Impersonation (Service Account to Service Account)
```bash
# Service A impersonates Service B for specific API call
gcloud auth print-access-token --impersonate-service-account=service-b@proj.iam.gserviceaccount.com
```

## Troubleshooting

| Error | Likely Cause | Fix |
|-------|--------------|-----|
| `Could not automatically determine credentials` | No ADC found | Run `gcloud auth application-default login` |
| `Request had invalid authentication credentials` | Expired token / wrong key | Re-run auth; check key not revoked |
| `Permission denied` / `403 Forbidden` | Missing IAM role | Grant required role on resource/project |
| `Service account not found` | Typo in email / deleted SA | Verify SA exists: `gcloud iam service-accounts list` |

## Validation Checklist

Before deploying, verify:
- [ ] No service account keys committed to git
- [ ] ADC works locally: `gcloud auth application-default print-access-token`
- [ ] CI/CD uses WIF, not keys
- [ ] Service accounts have minimal roles
- [ ] `gcloud auth list` shows expected accounts

## Related Skills

- `google-cloud-recipe-onboarding` — First project setup
- `gcloud` — Command validation & safety guardrails
- `retrieving-developer-knowledge` — Official auth docs