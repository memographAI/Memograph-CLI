# Analyze API Design for CLI Integration

## Goal

Define the hosted API contract that Memograph CLI can call directly, without user login, using a synchronous analysis response.

## Design Principles

- No interactive authentication required for CLI users.
- Single-call analysis (`POST`) with final result in response.
- Response shape compatible with CLI `InspectResult` to avoid renderer rewrites.
- Strong abuse controls for public anonymous traffic.

## Endpoint

- Primary endpoint: `POST /v1/analyze`
- Compatibility alias (optional): `POST /analyze`
- Content type: `application/json`

## Authentication Model

- Public anonymous endpoint for CLI.
- No per-user login/token required.
- Server-side controls required:
  - IP + user-agent rate limiting.
  - WAF/bot filtering.
  - Payload limits and early rejection.

## Request Contract

### Headers

- `Content-Type: application/json` (required)
- `User-Agent: memograph-cli/<version>` (required by policy)
- `X-Request-Id: <uuid>` (optional, echoed back for tracing)

### Request Body

```json
{
  "schema_version": "1.0",
  "messages": [
    { "idx": 0, "role": "user", "content": "My name is Tusher" },
    { "idx": 1, "role": "assistant", "content": "Nice to meet you!" }
  ],
  "raw_text": "",
  "options": {
    "max_messages": 2000
  },
  "client": {
    "name": "memograph-cli",
    "version": "0.1.0"
  }
}
```

### Field Notes

- `schema_version`: required, currently `"1.0"`.
- `messages`: required if `raw_text` is not provided; follows CLI transcript model.
- `raw_text`: optional; if present and non-empty, server can prioritize raw analysis mode.
- `options.max_messages`: optional cap hint from CLI.
- `client`: optional metadata for observability and throttling policies.

## Success Response Contract (200)

Response body should be directly compatible with `InspectResult`:

```json
{
  "drift_score": 25,
  "raw_score": 24.8,
  "token_waste_pct": 12.3,
  "events": [
    {
      "type": "preference_forgotten",
      "severity": 4,
      "confidence": 0.91,
      "summary": "User repeated language preference.",
      "preference_key": "language",
      "preference_value": "Bangla",
      "evidence": {
        "msg_idxs": [2, 4],
        "snippets": ["Please reply in Bangla", "Reply in Bangla please"]
      }
    }
  ],
  "should_have_been_memory": [
    {
      "fact_key": "identity:name",
      "fact_value": "Tusher",
      "msg_idx": 0,
      "confidence": 0.95
    }
  ],
  "timings_ms": {
    "extract_facts": 322.5,
    "repetition": 0,
    "session_reset": 0,
    "contradictions": 0,
    "pref_forgotten": 0,
    "drift_detection": 644.2
  }
}
```

## Error Contract

All errors return:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit reached. Please retry later.",
    "request_id": "9a6d79f4-27d8-43a0-b3e9-ae6f62c09a3b",
    "retryable": true
  }
}
```

### Status Code Mapping

| Status | `error.code` | Meaning | Retryable |
|---|---|---|---|
| `400` | `INVALID_REQUEST` | Invalid schema, missing required fields, bad JSON structure | false |
| `413` | `PAYLOAD_TOO_LARGE` | Transcript exceeds byte/message limits | false |
| `429` | `RATE_LIMITED` | Per-IP or policy rate limit exceeded | true |
| `500` | `INTERNAL_ERROR` | Unexpected server failure | true |
| `503` | `SERVICE_UNAVAILABLE` | Temporary dependency outage/overload | true |

### Error Response Headers

- `X-Request-Id`: required in all responses.
- `Retry-After`: recommended for `429` and `503`.

## Operational Limits (Recommended Defaults)

- Max request body: `1 MB`.
- Max `messages` length: `2000`.
- Max single message length: `20 KB`.
- Max `raw_text` length: `500 KB`.
- Default rate limit: e.g., `60 requests/minute per IP` (tune from telemetry).

## Idempotency and Request Identity

- `POST /v1/analyze` is functionally pure for identical payloads but not guaranteed byte-identical outputs.
- If `X-Request-Id` is provided, it is used for tracing and safe duplicate detection in logs.
- No strict idempotency key contract required for CLI v1.

## Latency and Reliability Targets

- P50 latency: <= 2 seconds.
- P95 latency: <= 8 seconds.
- Hard timeout for synchronous processing: <= 25 seconds.
- Availability target: 99.9% monthly for `/v1/analyze`.

## Versioning Strategy

- Path versioning recommended: `/v1/analyze`.
- Non-breaking additions allowed within `v1`:
  - New optional response fields.
  - New optional request `options`.
- Breaking changes require new version path (`/v2/analyze`).

## Security and Abuse Mitigation

- Enforce strict JSON schema validation before compute-heavy analysis.
- Sanitize and minimize logs:
  - Do not store raw transcript content by default.
  - Store request metadata and aggregate counters only.
- Apply WAF rules, bot signatures, and anomaly detection.
- Consider dynamic throttling when abuse spikes.

## CLI Integration Requirements for Backend

Backend must ensure:

- `200` response fields match CLI `InspectResult` names exactly.
- Stable error envelope and `code` values for deterministic CLI messaging.
- `X-Request-Id` is always present for support/debugging.
- `429`/`503` include `Retry-After` when possible.

## Compatibility Checklist

- Accept transcript payload shape currently emitted from `src/core/load.ts` and `src/core/normalize.ts`.
- Preserve event object flexibility while supporting known event types:
  - `repetition_cluster`
  - `session_reset`
  - `preference_forgotten`
  - `contradiction`
- Keep numeric fields as numbers (`drift_score`, timings, confidence).
