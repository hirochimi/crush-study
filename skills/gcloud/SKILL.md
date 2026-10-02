---
name: gcloud
description: Safety-critical validation, best practices, and execution guardrails for gcloud CLI commands
user-invocable: true
disable-model-invocation: false
compatibility: "Crush >= 0.1.0, Agent Skills 1.0"
metadata:
  category: google-cloud
  source: google-cloud-developer-plugin
  version: "1.0.0"
---

# gcloud CLI Safety & Best Practices

This skill provides guardrails for `gcloud` CLI usage. It validates commands before execution, prevents dangerous operations, and enforces Google Cloud best practices.

## When to Use

- Any time you or the agent runs `gcloud` commands
- Before executing mutating operations (create, delete, update, set-iam-policy)
- When troubleshooting gcloud errors
- When unsure about command syntax or flags

## Core Guardrails

### 1. Destructive Command Confirmation

The following commands **require explicit confirmation** unless `--quiet` is used with a clear comment:

| Command Pattern | Risk | Guardrail |
|-----------------|------|-----------|
| `gcloud * delete *` | Irreversible resource deletion | Prompt: "This will delete X. Continue?" |
| `gcloud * remove-iam-policy-binding` | Permission revocation | Show affected members before confirm |
| `gcloud projects delete` | **Entire project deletion** | Double confirmation + project ID verification |
| `gcloud * set-iam-policy` | Overwrites entire policy | Show diff; require `--etag` for safety |
| `gcloud compute instances delete` | VM termination | List instances; confirm each |

### 2. Dangerous Flag Detection

Warn when these flags are used without safeguards:

| Flag | Risk | Required Mitigation |
|------|------|---------------------|
| `--quiet` / `-q` | Skips all prompts | Only with explanatory comment |
| `--async` | Returns before completion | Must capture operation ID for polling |
| `--force` | Bypasses safety checks | Justify in comment |
| `--all` | Affects all resources | Use filter/limit instead |

### 3. Resource Reference Validation

Before any command that references resources:
- [ ] Project ID validated (`gcloud projects describe $PROJECT_ID`)
- [ ] Resource exists (`gcloud $SERVICE $RESOURCE describe $NAME`)
- [ ] Region/zone specified or default configured
- [ ] Labels follow naming convention (`env=`, `owner=`, `managed-by=`)

## Command Patterns

### Safe Patterns (Auto-approve)

```bash
# Read-only operations
gcloud * list
gcloud * describe
gcloud * get-iam-policy
gcloud * describe --format=json
gcloud auth list
gcloud config list
gcloud projects list
gcloud services list --enabled
```

### Caution Patterns (Warn but allow)

```bash
# Creates/modifies but generally safe
gcloud * create --dry-run
gcloud * create --labels=env=dev,owner=$USER
gcloud * update --update-labels=...
gcloud * add-iam-policy-binding --role=roles/viewer --member=user:...
```

### Dangerous Patterns (Block without explicit override)

```bash
# HIGH RISK - Require explicit human approval
gcloud projects delete PROJECT_ID
gcloud * delete * --quiet
gcloud * set-iam-policy * --quiet
gcloud * remove-iam-policy-binding * --quiet
gcloud alpha *  # Alpha features unstable
gcloud beta * --quiet  # Beta + quiet = danger
```

## Best Practices Enforced

### 1. Always Specify Project Explicitly
```bash
# Good
gcloud compute instances list --project=my-project

# Avoid (relies on config default)
gcloud compute instances list
```

### 2. Use Labels for Cost Allocation
```bash
# Required labels on all created resources
gcloud compute instances create my-vm \
  --labels=env=dev,owner=jane,managed-by=crush \
  --project=my-project
```

### 3. Use `--format=json` for Scripting
```bash
# Machine-readable output for chaining
gcloud compute instances list --format=json | jq -r '.[] | select(.status=="RUNNING") | .name'
```

### 4. Prefer `gcloud beta`/`alpha` with Version Pinning
```bash
# Document why beta/alpha is needed
# gcloud beta run deploy --image=...  # Required: Cloud Run feature not in GA
```

### 5. Clean Up After Yourself
```bash
# Track created resources for cleanup
# Use gcloud resource manager tags or naming convention: crush-temp-*
gcloud compute instances list --filter="name:crush-temp-*" --format="value(name)" | xargs -I{} gcloud compute instances delete {} --quiet
```

## Validation Functions

The hook system provides these validation commands:

### `crush-gcloud-validate`
```bash
# Called by PreToolUse hook before gcloud execution
# Returns: ALLOW / DENY / MODIFY
crush-gcloud-validate "gcloud compute instances delete my-vm --zone=us-central1-a"
# → DENY: "Destructive command. Confirm with: gcloud compute instances delete my-vm --zone=us-central1-a --confirm"
```

### `crush-gcloud-suggest-skills`
```bash
# Called when gcloud command matches product patterns
# Returns skill suggestions for agent
crush-gcloud-suggest-skills "gcloud container clusters create"
# → SUGGEST: gke-basics, gke-autopilot, gke-security
```

## Common Error Patterns & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `ERROR: (gcloud.*) FAILED_PRECONDITION` | Precondition failed (e.g., resource in use) | Check dependencies; use `--force` with caution |
| `ERROR: (gcloud.*) PERMISSION_DENIED` | Missing IAM permission | Run `gcloud projects get-iam-policy PROJECT --flatten=bindings` to audit |
| `ERROR: (gcloud.*) NOT_FOUND` | Resource doesn't exist | Verify project/region/name; check `gcloud config list` |
| `ERROR: (gcloud.*) QUOTA_EXCEEDED` | Quota limit reached | Request quota increase or clean unused resources |
| `ERROR: (gcloud.*) INVALID_ARGUMENT` | Bad flag value / missing required | Run command with `--help`; check format |

## Integration with Hook System

### PreToolUse Hook (Automatic)
```bash
# In crushrc:
hook add PreToolUse gcloud-guardrail \
  --command "crush-gcloud-validate" \
  --match-tool "bash" \
  --match-pattern "gcloud *"
```

### Hook Decision Flow
```
gcloud command received
       │
       ▼
  Read-only? ──Yes──▶ ALLOW
       │No
       ▼
  Destructive? ──Yes──▶ Require confirmation / DENY
       │No
       ▼
  Uses --quiet without comment? ──Yes──▶ WARN / DENY
       │No
       ▼
  Beta/Alpha without justification? ──Yes──▶ WARN
       │No
       ▼
  ALLOW
```

## Related Skills

- `google-cloud-recipe-auth` — Credential setup for gcloud
- `google-cloud-recipe-onboarding` — Project setup before gcloud use
- `finding-google-skills` — Discover product-specific skills
- `retrieving-developer-knowledge` — Official gcloud reference