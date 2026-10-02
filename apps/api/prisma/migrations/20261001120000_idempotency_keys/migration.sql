-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "tenantId" TEXT NOT NULL,
    "alcance" TEXT NOT NULL,
    "llave" TEXT NOT NULL,
    "hashSolicitud" TEXT NOT NULL,
    "recursoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("tenantId","alcance","llave")
);

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiraEn_idx" ON "IdempotencyKey"("expiraEn");

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

