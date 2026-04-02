# CodeGeni SaaS Readiness Checklist

This document captures the remaining work from Phase 6 of `Docs/first_plan.md` so we have a concrete backlog for hardening the platform before multi-tenant deployment.

## Tenant Isolation

- [ ] Parameterize `CodegeniMemoryStore` with a tenant identifier instead of deriving collections solely from the filesystem path.
- [ ] Prefix every Chroma collection with both the tenant ID and workspace hash (`codegeni_<tenant>_<hash>`).
- [ ] Move Docker sandbox `binds` to tenant-specific temporary directories so tenants never share the same host mount paths.

## Authentication and Authorization

- [ ] Introduce JWT + API key middleware at the MCP server layer. Pending tasks:
  - Accept `Authorization: Bearer <token>` headers on every `/tools/*/execute` call.
  - Verify signatures using the shared auth service (placeholder: `CODEGENI_JWT_PUBLIC_KEY`).
  - Enforce per-tool permission scopes encoded in the token claims.
- [ ] Add CLI helpers for issuing/revoking tenant API keys.

## Rate Limiting and Metering

- [ ] Deploy Redis (or Upstash) and add a token-bucket rate limiter to the MCP server. Track both requests per minute and concurrent tool invocations.
- [ ] Emit structured events (`tool.started`, `tool.completed`) to a usage topic (Kafka or Redis Stream) for downstream metering.

## Observability

- [ ] Add OpenTelemetry traces around tool execution (span per tool, attributes for workspace, latency, error codes).
- [ ] Ship Docker sandbox logs to a centralized sink (Loki, CloudWatch, etc.).

## Deployment

- [ ] Create a Helm chart that provisions:
  - MCP Deployment + Service
  - ChromaDB StatefulSet
  - Redis for rate limiting
  - Docker runner DaemonSet (if using `docker:dind`)
- [ ] Add GitHub Actions workflows for lint → test → security scan → container publish.

Until these boxes are checked, treat the project as **internal only**. The checklist lives in git so we can track progress via PRs (tick a box and link the PR in the bullet).
