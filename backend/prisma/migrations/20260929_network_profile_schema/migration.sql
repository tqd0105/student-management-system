-- Network-aware attendance policy and audit fields
CREATE TYPE "NetworkEnforcementMode" AS ENUM ('OFF', 'REQUIRED', 'FLAG_ONLY');

CREATE TABLE "network_profiles" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicIp" TEXT NOT NULL,
    "provider" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_profiles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "attendance_sessions"
    ADD COLUMN "networkProfileId" TEXT,
    ADD COLUMN "networkEnforcementMode" "NetworkEnforcementMode" NOT NULL DEFAULT 'OFF';

ALTER TABLE "attendance_logs"
    ADD COLUMN "clientIp" TEXT,
    ADD COLUMN "networkMatched" BOOLEAN,
    ADD COLUMN "networkCheckReason" TEXT;

CREATE UNIQUE INDEX "network_profiles_ownerId_publicIp_key" ON "network_profiles"("ownerId", "publicIp");
CREATE INDEX "network_profiles_ownerId_isActive_idx" ON "network_profiles"("ownerId", "isActive");
CREATE INDEX "attendance_sessions_networkProfileId_idx" ON "attendance_sessions"("networkProfileId");

ALTER TABLE "network_profiles"
    ADD CONSTRAINT "network_profiles_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_sessions"
    ADD CONSTRAINT "attendance_sessions_networkProfileId_fkey"
    FOREIGN KEY ("networkProfileId") REFERENCES "network_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;