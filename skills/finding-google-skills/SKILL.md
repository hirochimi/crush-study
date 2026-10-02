---
name: finding-google-skills
description: Discovery and on-demand installation of specialized Google Cloud skills from the Google Agent Skills repository
user-invocable: true
disable-model-invocation: false
compatibility: "Crush >= 0.1.0, Agent Skills 1.0"
metadata:
  category: google-cloud
  source: google-cloud-developer-plugin
  version: "1.0.0"
---

# Finding Google Cloud Skills

This skill enables discovery and installation of specialized Google Cloud skills from the [Google Agent Skills repository](https://github.com/google/skills). Use it when you need product-specific expertise beyond the core foundational skills.

## When to Use

- Task requires deep knowledge of a specific GCP product (GKE, Cloud Run, BigQuery, etc.)
- Agent suggests "I should use the X skill for this"
- You want to browse available Google Cloud skills
- New GCP product released and you need updated skills

## Skill Catalog Structure

Skills are organized in the Google Skills repo at:
```
plugins/cloud/google-cloud-*/skills/
├── gke-basics/
├── gke-autopilot/
├── gke-security/
├── gke-networking/
├── cloud-run-basics/
├── cloud-run-jobs/
├── cloud-sql-basics/
├── cloud-sql-postgres/
├── cloud-sql-mysql/
├── bigquery-basics/
├── bigquery-ml/
├── artifact-registry-basics/
├── cloud-build-basics/
├── secret-manager-basics/
├── vpc-basics/
├── cloud-armor-basics/
├── cloud-cdn-basics/
├── dataflow-basics/
├── pubsub-basics/
├── vertex-ai-basics/
└── ... (50+ skills and growing)
```

## Discovery Commands

### List All Available Skills
```bash
# Via Crush (when skill catalog supports remote)
crush skill search google-cloud

# Manual: Browse GitHub
# https://github.com/google/skills/tree/main/plugins/cloud
```

### Search by Product/Keyword
```bash
# Find skills for a specific product
crush skill search "gke"
crush skill search "cloud run"
crush skill search "bigquery"
crush skill search "vertex ai"
```

### Get Skill Details
```bash
# View skill description before installing
crush skill info gke-basics
crush skill info cloud-run-basics
```

## Installation

### Install Single Skill
```bash
crush skill install gke-basics
crush skill install cloud-run-basics
```

### Install Multiple Skills
```bash
crush skill install gke-basics gke-autopilot gke-security
```

### Install from Specific Source
```bash
# From Google Skills repo (default)
crush skill install gke-basics --source google/skills

# From local path
crush skill install ./my-custom-gcp-skill
```

## Auto-Discovery (Progressive Disclosure)

The `gcloud` skill's hook system automatically suggests relevant skills based on commands:

| gcloud Command Pattern | Suggested Skills |
|------------------------|------------------|
| `gcloud container clusters *` | `gke-basics`, `gke-autopilot`, `gke-networking` |
| `gcloud run *` | `cloud-run-basics`, `cloud-run-jobs` |
| `gcloud sql *` | `cloud-sql-basics`, `cloud-sql-postgres`, `cloud-sql-mysql` |
| `gcloud bigquery *` | `bigquery-basics`, `bigquery-ml` |
| `gcloud artifacts *` | `artifact-registry-basics` |
| `gcloud builds *` | `cloud-build-basics` |
| `gcloud secrets *` | `secret-manager-basics` |
| `gcloud compute networks *` | `vpc-basics`, `cloud-armor-basics` |
| `gcloud ai *` | `vertex-ai-basics` |

## Skill Categories

### Compute & Containers
| Skill | Focus |
|-------|-------|
| `gke-basics` | GKE Standard cluster lifecycle, node pools, upgrades |
| `gke-autopilot` | Autopilot mode: serverless Kubernetes |
| `gke-security` | Workload Identity, Binary Authorization, Network Policies |
| `gke-networking` | VPC-native, Multi-cluster Services, Gateway API |
| `cloud-run-basics` | Services, revisions, traffic splitting, custom domains |
| `cloud-run-jobs` | Batch/async workloads on Cloud Run |
| `cloud-run-functions` | 2nd gen Cloud Functions on Cloud Run |

### Data & Analytics
| Skill | Focus |
|-------|-------|
| `bigquery-basics` | Queries, partitioning, clustering, BI Engine |
| `bigquery-ml` | BigQuery ML: CREATE MODEL, forecasting, classification |
| `dataflow-basics` | Apache Beam pipelines, streaming, templates |
| `pubsub-basics` | Topics, subscriptions, ordering, dead-letter queues |
| `dataproc-basics` | Spark/Hadoop clusters, serverless Spark |

### Storage & Databases
| Skill | Focus |
|-------|-------|
| `cloud-sql-basics` | Instance management, HA, read replicas, backups |
| `cloud-sql-postgres` | PostgreSQL-specific: extensions, logical replication |
| `cloud-sql-mysql` | MySQL-specific: GTID, replication |
| `spanner-basics` | Global SQL, instance config, schema design |
| `firestore-basics` | NoSQL documents, indexes, security rules |
| `memorystore-basics` | Redis/Memcached, HA, auth |
| `artifact-registry-basics` | Docker, Maven, npm, Python packages |

### CI/CD & DevOps
| Skill | Focus |
|-------|-------|
| `cloud-build-basics` | Build triggers, kaniko, custom builders, private pools |
| `cloud-deploy-basics` | Delivery pipelines, targets, progressive rollout |
| `source-repos-basics` | Cloud Source Repos, mirroring, notifications |

### Security & Networking
| Skill | Focus |
|-------|-------|
| `vpc-basics` | VPC, subnets, firewall rules, routes, peering |
| `cloud-armor-basics` | WAF, rate limiting, adaptive protection |
| `cloud-cdn-basics` | Cache keys, signed URLs, cache invalidation |
| `secret-manager-basics` | Secrets, versions, rotation, IAM conditions |
| `kms-basics` | Key rings, keys, rotation, CMEK/CSEK |

### AI/ML
| Skill | Focus |
|-------|-------|
| `vertex-ai-basics` | Training, prediction, pipelines, feature store |
| `vertex-ai-generative` | Gemini, PaLM, embedding models, fine-tuning |

## Versioning & Updates

```bash
# Check for skill updates
crush skill outdated

# Update specific skill
crush skill update gke-basics

# Update all Google Cloud skills
crush skill update --all --source google/skills
```

## Offline / Air-Gapped Usage

```bash
# Export skills for offline use
crush skill export gke-basics cloud-run-basics --output ./gcp-skills.tar.gz

# Import on air-gapped machine
crush skill import ./gcp-skills.tar.gz
```

## Creating Custom Skills

If a skill doesn't exist, create your own:

```bash
# 1. Scaffold new skill
mkdir -p ~/.config/crush/skills/my-gcp-skill
cd ~/.config/crush/skills/my-gcp-skill

# 2. Create SKILL.md (see other skills for template)
cat > SKILL.md <<'EOF'
---
name: my-gcp-skill
description: Custom skill for ...
user-invocable: true
---
# My Custom GCP Skill
...
EOF

# 3. Load it
crush skill load my-gcp-skill
```

## Best Practices

1. **Install only what you need** — Each skill adds context; avoid bloat
2. **Update regularly** — Google Cloud evolves fast; `crush skill update` weekly
3. **Share with team** — Commit skills to project `.crush/skills/` for consistency
4. **Combine with `gcloud` skill** — Guardrails + specialized knowledge = safe expertise

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| Skill not found | Check spelling; run `crush skill search` to list available |
| Install fails (network) | Use `--source` with local clone of google/skills repo |
| Skill conflicts | Check `crush skill list` for duplicates; disable unused |
| Outdated info | Run `crush skill update <skill>` |

## Related Skills

- `gcloud` — Command validation that triggers skill suggestions
- `retrieving-developer-knowledge` — Official docs for skill content
- `google-cloud-recipe-auth` — Auth setup needed for most product skills
- `google-cloud-recipe-onboarding` — Project setup prerequisite