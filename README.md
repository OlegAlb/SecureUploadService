[Русский](README.ru.md) | English

# Secure Upload Service

Production-oriented secure file upload microservice focused on preventing arbitrary file upload vulnerabilities and enabling asynchronous security auditing.

---

# Features

## Secure Streaming Upload

- True stream-first upload pipeline
- Files are not fully loaded into RAM
- Incremental SHA-256 hashing
- File size limiting during stream processing

---

## MIME Validation via Magic Bytes

Does not trust user-provided extensions or `Content-Type`.

Actual MIME type is detected using magic bytes inspection.

Example:

```text
malware.php.jpg
```

will still be detected as:

```text
application/x-php
```

and rejected.

---

## RCE Mitigation

Uploaded files are protected through:

- randomized 64-byte filenames;
- storage outside executable paths;
- restricted filesystem permissions (`0600`);
- no user-controlled paths.

---

## Asynchronous Audit Pipeline

Every upload event (accepted or blocked):

```text
API
  |
  v
Redis Queue
  |
  v
Audit Worker
  |
  v
ClickHouse
```

Audit logs are inserted into ClickHouse using bulk inserts for efficient analytical storage.

---

## Bulk Insert Strategy

The worker accumulates audit events in memory and periodically flushes batches into ClickHouse.

This avoids:

```text
1 upload
=
1 INSERT
```

which is inefficient for analytical databases.

---

## Distributed Rate Limiting

Redis-backed rate limiting:

```text
100 uploads / minute / IP
```

protects against upload spam and basic DoS attempts.

---

## Healthcheck Endpoint

```http
GET /health
```

Checks:

- Redis connectivity
- ClickHouse connectivity

Suitable for:

- Docker healthchecks
- Kubernetes readiness probes
- load balancers
- monitoring systems

---

# Architecture

```text
                +-------------------+
                |      Client       |
                +---------+---------+
                          |
                          v
                +-------------------+
                |    Upload API     |
                +-------------------+
                   |            |
                   |            |
                   v            v
         +----------------+   Local Storage
         |     Redis      |
         +----------------+
                   |
                   v
         +----------------+
         |  Audit Worker  |
         +----------------+
                   |
                   v
         +----------------+
         |   ClickHouse   |
         +----------------+
```

---

# Upload Pipeline

```text
Incoming Stream
       |
       +--> first 4KB buffer
       |
       +--> magic bytes validation
       |
       +--> SHA-256 hashing
       |
       v
Secure Write Stream
```

Only the initial bytes required for validation are buffered in memory.

The remaining payload streams directly to disk.

---

# Security Decisions

## Why magic bytes instead of file extensions?

File extensions are user-controlled and trivially spoofed.

Example:

```text
shell.php.jpg
```

Magic byte validation inspects the actual binary signature of the file.

---

## Why randomized filenames?

Predictable filenames can enable:

- direct file discovery;
- malicious execution attempts;
- enumeration attacks.

Uploaded files are stored as cryptographically random identifiers.

---

## Why asynchronous audit logging?

Audit logging should not block uploads.

The API publishes events into Redis and immediately returns the response.

Heavy analytical writes are delegated to a separate worker process.

---

## Why ClickHouse?

ClickHouse is optimized for:

- append-heavy workloads;
- analytical queries;
- high-throughput inserts;
- log/event storage.

This makes it well suited for audit pipelines.

---

# Threat Model

The service is designed to mitigate:

- Arbitrary File Upload
- MIME spoofing
- Path Traversal
- Basic upload DoS
- RCE through predictable filenames
- Synchronous audit bottlenecks

---

# Tech Stack

- Node.js
- Express
- Redis
- ClickHouse
- Docker
- TypeScript

---

# Running Locally

## Start infrastructure

```bash
docker compose up --build
```

---

## Upload file

```bash
curl \
-F "file=@photo.jpg" \
http://localhost:3000/upload
```

---

## Download file

```bash
curl \
http://localhost:3000/files/<file-id>
```

---

## Healthcheck

```bash
curl http://localhost:3000/health
```
