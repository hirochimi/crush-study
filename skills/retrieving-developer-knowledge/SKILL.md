---
name: retrieving-developer-knowledge
description: Grounded retrieval of official Google Cloud documentation via Developer Knowledge MCP server
user-invocable: true
disable-model-invocation: false
compatibility: "Crush >= 0.1.0, Agent Skills 1.0"
metadata:
  category: google-cloud
  source: google-cloud-developer-plugin
  version: "1.0.0"
---

# Retrieving Google Developer Knowledge

This skill provides access to live, official Google Cloud documentation through the **Developer Knowledge MCP server**. It ensures the agent always references current documentation instead of potentially stale training data.

## When to Use

- Answering "how do I..." questions about Google Cloud
- Verifying current API syntax, limits, or features
- Checking deprecation notices and migration guides
- Finding official tutorials, quickstarts, and samples
- Validating gcloud command flags and examples
- Researching quotas, limits, and pricing details

## Prerequisites

1. **MCP Server Configured** (in crushrc):
   ```bash
   mcp add developer-knowledge \
     --type http \
     --url "https://developerknowledge.googleapis.com/mcp" \
     --header "X-Goog-Api-Key" "${DEVELOPERKNOWLEDGE_API_KEY}"
   ```

2. **API Key Set**:
   ```bash
   export DEVELOPERKNOWLEDGE_API_KEY="your-key"
   # Get key: https://developers.google.com/knowledge/quickstart#create-secure-key
   ```

3. **API Enabled**:
   ```bash
   gcloud services enable developerknowledge.googleapis.com --project=YOUR_PROJECT
   ```

## Available Tools (via MCP)

The Developer Knowledge MCP server exposes these tools:

| Tool | Description |
|------|-------------|
| `search_documentation` | Search official docs with natural language |
| `get_document` | Retrieve full document by URL/path |
| `list_products` | List all Google Cloud products with docs |
| `get_product` | Get product overview and documentation structure |

## Usage Patterns

### Pattern 1: Direct Question → Search → Answer
```bash
# User asks:
# "How do I set up Cloud Run with a custom domain?"

# Agent uses:
search_documentation(query: "Cloud Run custom domain setup")
# → Returns relevant doc sections with URLs

# Agent reads top results:
get_document(url: "https://cloud.google.com/run/docs/mapping-custom-domains")
# → Returns full current documentation
```

### Pattern 2: API Reference Lookup
```bash
# User asks:
# "What's the maximum request size for Cloud Run?"

# Agent searches:
search_documentation(query: "Cloud Run maximum request size limit")
# → Finds: "Request size limit: 32 MiB for HTTP requests"

# Agent verifies:
get_document(url: "https://cloud.google.com/run/docs/reference/limits")
```

### Pattern 3: gcloud Command Verification
```bash
# User asks:
# "What flags does 'gcloud run deploy' support for CPU allocation?"

# Agent searches:
search_documentation(query: "gcloud run deploy cpu flag")
# → Finds current flag reference

# Or gets CLI reference:
get_document(url: "https://cloud.google.com/sdk/gcloud/reference/run/deploy")
```

### Pattern 4: Deprecation / Migration Check
```bash
# User asks:
# "Is Cloud SQL MySQL 5.7 deprecated?"

# Agent searches:
search_documentation(query: "Cloud SQL MySQL 5.7 deprecation timeline")
# → Finds current deprecation notice and migration guide
```

## Best Practices

### 1. Always Cite Sources
```markdown
Based on [Cloud Run Custom Domains documentation](https://cloud.google.com/run/docs/mapping-custom-domains) (accessed 2026-01-15):
- Custom domains require domain ownership verification
- Supports both apex and subdomain mapping
- TLS certificates auto-provisioned
```

### 2. Include Access Date
Documentation changes frequently. Always note when you retrieved it:
> *Source: [Cloud Run Limits](https://cloud.google.com/run/docs/reference/limits), accessed 2026-01-15*

### 3. Prefer Search Over Direct URL
URLs change; search is more resilient:
```bash
# Good
search_documentation(query: "Cloud Run CPU allocation options")

# Fragile (URL may change)
get_document(url: "https://cloud.google.com/run/docs/configuring/cpu")
```

### 4. Verify Critical Limits
For quotas, limits, pricing — always verify from official source:
```bash
search_documentation(query: "Cloud Run maximum instances per service quota")
```

### 5. Combine with gcloud Skill
Use documentation to verify, then gcloud skill to execute safely:
```
1. search_documentation → "gcloud run deploy --cpu flag syntax"
2. gcloud skill validates command
3. Execute with guardrails
```

## Common Queries by Category

### Compute
- "Cloud Run CPU/memory limits"
- "GKE node pool upgrade strategy"
- "Compute Engine persistent disk types"
- "Cloud Functions vs Cloud Run comparison"

### Networking
- "Cloud Load Balancing setup"
- "VPC Service Controls configuration"
- "Cloud Armor WAF rules syntax"
- "Private Service Connect vs Private IP"

### Storage
- "Cloud SQL backup retention policy"
- "Cloud Storage lifecycle rules"
- "Filestore performance tiers"
- "Spanner instance sizing"

### Data & Analytics
- "BigQuery partitioning vs clustering"
- "Dataflow streaming vs batch"
- "Pub/Sub ordering keys"
- "Dataproc serverless Spark config"

### Security
- "Workload Identity Federation setup"
- "Binary Authorization policy"
- "Secret Manager rotation schedule"
- "Organization Policy constraints"

### AI/ML
- "Vertex AI model deployment options"
- "Gemini API rate limits"
- "Vertex AI Pipelines caching"

## MCP Tool Reference

### `search_documentation`
```json
{
  "query": "natural language search query",
  "product": "optional: specific product (e.g., 'cloud-run')",
  "limit": 10
}
```
Returns: Array of `{title, url, snippet, product}`

### `get_document`
```json
{
  "url": "full document URL from search results"
}
```
Returns: `{title, content, url, last_updated}`

### `list_products`
```json
{}
```
Returns: Array of `{id, name, description, doc_url}`

### `get_product`
```json
{
  "product": "product ID from list_products"
}
```
Returns: `{name, description, categories, getting_started_url, reference_url}`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid/missing API key | Check `DEVELOPERKNOWLEDGE_API_KEY` env var |
| `403 Forbidden` | API not enabled | Run `gcloud services enable developerknowledge.googleapis.com` |
| `429 Too Many Requests` | Rate limit exceeded | Implement exponential backoff; retry |
| `500 Internal Error` | Server issue | Retry; report if persistent |
| Empty results | Query too specific | Broaden search terms; try synonyms |

## Integration with Other Skills

| Skill | Integration |
|-------|-------------|
| `gcloud` | Verify command syntax before execution |
| `google-cloud-recipe-auth` | Check auth docs for new products |
| `finding-google-skills` | Discover specialized skills for products found in docs |
| `google-cloud-recipe-onboarding` | Reference onboarding docs for new projects |

## Caching Strategy

For performance, the agent should:
1. Cache search results for session duration
2. Cache full documents for 1 hour (docs don't change that fast)
3. Invalidate on explicit user request ("check latest docs")
4. Log access for audit: "Retrieved Cloud Run limits from Developer Knowledge MCP at 2026-01-15T10:30:00Z"

## Related Resources

- **Developer Knowledge API**: https://developers.google.com/knowledge/
- **MCP Server**: https://developers.google.com/knowledge/mcp
- **Quickstart**: https://developers.google.com/knowledge/quickstart
- **Google Cloud Docs**: https://cloud.google.com/docs
- **gcloud Reference**: https://cloud.google.com/sdk/gcloud/reference