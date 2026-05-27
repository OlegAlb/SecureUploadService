Русский | [English](README.md)

# Secure Upload Service

Production-oriented микросервис безопасной загрузки файлов с защитой от Arbitrary File Upload и асинхронным аудитом безопасности.

---

# Возможности

## Безопасная потоковая загрузка

- Настоящий stream-first upload pipeline
- Файлы не загружаются полностью в RAM
- Инкрементальный SHA-256 hashing
- Ограничение размера файла во время streaming processing

---

## MIME-валидация через Magic Bytes

Сервис не доверяет:

- расширению файла;
- `Content-Type`, переданному клиентом.

Настоящий MIME-тип определяется через анализ magic bytes.

Пример:

```text
malware.php.jpg
```

будет определён как:

```text
application/x-php
```

и заблокирован.

---

## Защита от RCE

Загружаемые файлы защищены через:

- случайные 64-byte filenames;
- хранение вне executable paths;
- filesystem permissions (`0600`);
- отсутствие user-controlled paths.

---

## Асинхронный аудит безопасности

Каждая загрузка (успешная или заблокированная):

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

Audit logs записываются в ClickHouse через bulk inserts для эффективного хранения аналитических данных.

---

## Bulk Insert Strategy

Worker накапливает audit events в памяти и периодически выполняет batch insert в ClickHouse.

Это позволяет избежать:

```text
1 upload
=
1 INSERT
```

что неэффективно для аналитических СУБД.

---

## Distributed Rate Limiting

Redis-backed rate limiting:

```text
100 uploads / minute / IP
```

защищает сервис от upload spam и базовых DoS-атак.

---

## Healthcheck Endpoint

```http
GET /health
```

Проверяет:

- Redis connectivity
- ClickHouse connectivity

Подходит для:

- Docker healthchecks
- Kubernetes readiness probes
- load balancers
- monitoring systems

---

# Архитектура

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

В памяти буферизуются только первые байты, необходимые для MIME-валидации.

Остальной payload stream-ится напрямую на диск.

---

# Security Decisions

## Почему magic bytes вместо file extensions?

Расширение файла полностью контролируется пользователем и легко spoof-ится.

Пример:

```text
shell.php.jpg
```

Magic byte validation анализирует реальную бинарную сигнатуру файла.

---

## Почему используются случайные filenames?

Предсказуемые filenames могут позволить:

- direct file discovery;
- malicious execution attempts;
- enumeration attacks.

Поэтому файлы сохраняются как cryptographically random identifiers.

---

## Почему audit logging асинхронный?

Audit logging не должен блокировать upload pipeline.

API публикует событие в Redis и сразу возвращает response.

Тяжёлые analytical writes делегируются отдельному worker process.

---

## Почему ClickHouse?

ClickHouse оптимизирован для:

- append-heavy workloads;
- analytical queries;
- high-throughput inserts;
- log/event storage.

Это делает его хорошим выбором для audit pipelines.

---

# Threat Model

Сервис спроектирован для mitigation следующих угроз:

- Arbitrary File Upload
- MIME spoofing
- Path Traversal
- Basic upload DoS
- RCE через predictable filenames
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

# Локальный запуск

## Запуск инфраструктуры

```bash
docker compose up --build
```

---

## Загрузка файла

```bash
curl \
-F "file=@photo.jpg" \
http://localhost:3000/upload
```

---

## Скачивание файла

```bash
curl \
http://localhost:3000/files/<file-id>
```

---

## Healthcheck

```bash
curl http://localhost:3000/health
```

---

# Docker Services

Проект использует Docker Compose для запуска:

- Upload API
- Audit Worker
- Redis
- ClickHouse

---

# Known Limitations

## Redis Lists

Текущая реализация использует:

```text
LPUSH / BRPOP
```

Это обеспечивает:

```text
at-most-once delivery
```

Если worker упадёт после `BRPOP`, но до ClickHouse insertion, часть событий может быть потеряна.

Production-grade альтернативы:

- Redis Streams
- Apache Kafka
- RabbitMQ

---

## Local File Storage

Сейчас файлы хранятся локально на filesystem.

Production systems обычно используют:

- S3-compatible object storage
- distributed storage systems
- CDN-backed asset delivery

---

# Future Improvements

Возможные следующие шаги:

- Redis Streams consumer groups
- ClamAV malware scanning
- S3 object storage
- OpenTelemetry tracing
- Prometheus metrics
- Grafana dashboards

---

# Цель проекта

Проект был создан для демонстрации:

- secure upload handling;
- stream-based backend architecture;
- asynchronous event processing;
- distributed system fundamentals;
- production-oriented backend engineering.
