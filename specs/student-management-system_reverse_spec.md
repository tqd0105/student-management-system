# Student Management System - Reverse Specification

## Scope

This document records behavior observed in the repository as of 2026-09-29. It is an implementation-based reference for future attendance anti-fraud work, especially QR check-in constrained by network/IP.

## Architecture

- Monorepo with a Next.js 15/React 19 frontend in `frontend/` and an Express/TypeScript backend in `backend/`.
- Backend entrypoint: `backend/src/index.ts`. It enables Helmet, permissive environment-dependent CORS, one global rate limiter, JSON parsing, then mounts `/api/auth`, `/api/users`, `/api/classes`, `/api/attendance`, `/api/admin`, `/api/teacher`, and `/api/student`.
- Persistence: Prisma ORM with a PostgreSQL datasource declared in `backend/prisma/schema.prisma`.
- Authentication: Bearer JWT verified by `backend/src/middleware/auth.ts`; route middleware checks `ADMIN`, `TEACHER`, and `STUDENT` roles.
- Frontend API base URL is selected at runtime in `frontend/src/config/api.ts` based on localhost, LAN, tunnel, or production hostname.

## Domain Model

Attendance is represented by:

- `AttendanceSession`: teacher, class, start/end time, optional GPS center/radius, QR token/expiry, active flag.
- `AttendanceLog`: student, session, device identifier, check-in time, status, optional submitted latitude/longitude. A composite unique constraint prevents one student from recording twice in a session.
- `DeviceRegistration`: user/device pairs with an active flag, but the attendance scan path does not currently consult this table.
- `ClassEnrollment`: the authorization link between a student and a class.

The relevant schema is in `backend/prisma/schema.prisma` (`User`, `Class`, `ClassEnrollment`, `AttendanceSession`, `AttendanceLog`, and `DeviceRegistration`).

## Active Attendance Flow

The flow used by the current dashboard is the teacher/student route pair:

1. Teacher frontend calls `POST /api/teacher/classes/:classId/sessions` to create a session.
2. Teacher frontend calls `POST /api/teacher/sessions/:sessionId/qr` to generate a UUID QR token with a five-minute `qrExpiresAt`; the QR payload is JSON containing `sessionId`, `qrCode`, `classId`, and a client timestamp.
3. `frontend/src/components/student/QRScanner.tsx` decodes the QR locally with camera/canvas/jsQR and passes the raw JSON to `ApiService.scanQRAndCheckIn`.
4. Student frontend calls `POST /api/student/scan-qr`.
5. `backend/src/controllers/student.ts` parses the QR JSON and requires matching session/class/token, `isActive`, and an unexpired `qrExpiresAt`; it checks `ClassEnrollment`, rejects an existing `(studentId, sessionId)` record, then creates `AttendanceLog`.
6. Status is `PRESENT` or `LATE` based on the session start time. The scan path stores `latitude`/`longitude` if supplied, but does not enforce the session GPS fields.

## Secondary / Legacy Attendance Flow

There is a separate implementation under `/api/attendance`:

- `POST /api/attendance/sessions` creates an active session immediately and generates a random token.
- `POST /api/attendance/checkin` accepts `qrCode`, `deviceId`, `latitude`, and `longitude` and contains Haversine radius checking.
- `GET /api/attendance/qr/:qrCode`, session close, and report endpoints belong to this controller.

The main frontend QR path does not call this flow. Any new IP restriction must therefore be implemented in `/api/student/scan-qr` first, with the secondary flow either aligned or explicitly deprecated.

## Observed Requirements (EARS)

- The API shall require a valid bearer JWT for attendance routes.
- When a teacher creates a QR session, the system shall bind the session to the teacher-owned class.
- When a student submits a QR payload, the system shall reject malformed payloads, unknown sessions, inactive sessions, expired QR tokens, non-enrolled students, and duplicate check-ins.
- When a student submits a valid check-in, the system shall create one `AttendanceLog` and classify it as present or late.
- Where GPS fields are submitted to the legacy `/api/attendance/checkin` flow and the session has a configured radius, the system shall reject a check-in outside the radius.
- The current active scan flow shall record the request user-agent as `AttendanceLog.deviceId`; it shall not currently record the server-observed client IP.

## IP-Dependent QR Implications

The backend can observe the request IP, but deployment topology matters:

- In local/LAN mode, Express may see the device's LAN address.
- Behind Render, Vercel, a tunnel, or Nginx, `req.ip` may be a proxy address unless trusted proxy configuration and forwarding headers are handled deliberately.
- Public/mobile networks may put many students behind one NAT IP, while IPv4/IPv6 changes and carrier-grade NAT can change the observed value during a class.
- IP should therefore be a risk signal or configurable network allowlist, not the sole identity proof. The durable binding should be to the session, authenticated student, enrolled class, short QR TTL, and optionally a registered device/GPS policy.

## Known Gaps and Risks

1. The active `/api/student/scan-qr` path does not enforce `AttendanceSession.locationLat`, `locationLng`, or `radiusMeters`; the GPS enforcement exists only in the secondary controller.
2. `DeviceRegistration` exists but is not consulted by the active scan path. The active path stores a user-agent string as `deviceId`, which is not a stable or trustworthy device identity.
3. There are two QR/session implementations with different semantics, payloads, and expiry behavior. This creates drift risk for future anti-fraud rules.
4. `backend/src/index.ts` enables CORS for all origins outside production and explicitly allows requests without an Origin header; this is useful for LAN/mobile testing but weakens the trust boundary.
5. `docker-compose.prod.yml` sets `DATABASE_URL=file:./dev.db` even though Prisma declares PostgreSQL; this production compose configuration is inconsistent with the schema.
6. `render.yaml` contains literal database, JWT, and Gmail credential values. These values should be rotated and moved to deployment secrets before production use.
7. No repository test files were found for the attendance flows. IP/proxy behavior, race conditions on duplicate check-in, and authorization should receive integration coverage before rollout.

## Recommended Boundary for the IP Feature

Implement the feature around the active route `POST /api/student/scan-qr` and add session-level policy fields rather than hard-coding a global rule. A likely policy model is:

- `networkPolicy`: disabled, exact IP allowlist, CIDR allowlist, or teacher-configured network identifier;
- captured server-observed IP plus normalized forwarding metadata on the attendance log;
- explicit result/reason for accepted, rejected, or flagged network checks;
- proxy-aware configuration and automated tests for direct, reverse-proxy, IPv4, and IPv6 requests.

Before implementation, decide whether an IP mismatch rejects the check-in immediately or records it as `INVALID`/`REVIEW`, and whether the classroom network is expected to be a single public IP, a LAN CIDR, or a list of approved networks.

## Primary Code Locations

- Server wiring: `backend/src/index.ts`
- Auth: `backend/src/middleware/auth.ts`, `backend/src/controllers/auth.ts`
- Active teacher QR flow: `backend/src/routes/teacher.ts`, `backend/src/controllers/teacher.ts`
- Active student scan flow: `backend/src/routes/student.ts`, `backend/src/controllers/student.ts`
- Secondary attendance flow: `backend/src/routes/attendance.ts`, `backend/src/controllers/attendance.ts`
- Data model: `backend/prisma/schema.prisma`
- QR scanner: `frontend/src/components/student/QRScanner.tsx`
- Student scan integration: `frontend/src/components/student/StudentDashboard.tsx`, `frontend/src/services/ApiService.ts`
- Deployment/network config: `docker-compose.prod.yml`, `render.yaml`, `frontend/src/config/api.ts`
