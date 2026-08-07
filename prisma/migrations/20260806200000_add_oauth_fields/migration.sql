-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'GITHUB');

-- AlterTable: passwordHash nullable + OAuth fields
ALTER TABLE "Credential" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "Credential" ADD COLUMN "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL';
ALTER TABLE "Credential" ADD COLUMN "providerId" TEXT;

-- CreateIndex: unique composite (provider, providerId) — NULL providerId rows are distinct in PostgreSQL
CREATE UNIQUE INDEX "Credential_provider_providerId_key" ON "Credential"("provider", "providerId");

-- CreateTable
CREATE TABLE "OAuthLinkToken" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthLinkToken_tokenHash_key" ON "OAuthLinkToken"("tokenHash");
CREATE INDEX "OAuthLinkToken_credentialId_idx" ON "OAuthLinkToken"("credentialId");

-- AddForeignKey
ALTER TABLE "OAuthLinkToken" ADD CONSTRAINT "OAuthLinkToken_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rollback note: revertir passwordHash a NOT NULL solo es seguro si no existen filas OAuth sin password.
