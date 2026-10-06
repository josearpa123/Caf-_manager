-- Anulación de recepciones (CU-02, RF-07/08, ADR-010). Solo aditiva: columnas
-- nuevas con valor por defecto o null, nada se renombra ni se borra.

-- CreateEnum
CREATE TYPE "EstadoRecepcion" AS ENUM ('ACTIVA', 'ANULADA');

-- AlterTable
ALTER TABLE "Recepcion"
  ADD COLUMN "estado" "EstadoRecepcion" NOT NULL DEFAULT 'ACTIVA',
  ADD COLUMN "anuladaAt" TIMESTAMP(3),
  ADD COLUMN "anuladaPorId" TEXT,
  ADD COLUMN "motivoAnulacion" TEXT;

ALTER TABLE "Pago"
  ADD COLUMN "anuladoAt" TIMESTAMP(3),
  ADD COLUMN "motivoAnulacion" TEXT;

ALTER TABLE "ConciliacionAnticipo"
  ADD COLUMN "anuladoAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Recepcion_tenantId_estado_idx" ON "Recepcion"("tenantId", "estado");

-- AddForeignKey
ALTER TABLE "Recepcion" ADD CONSTRAINT "Recepcion_anuladaPorId_fkey"
  FOREIGN KEY ("anuladaPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Los negocios que ya existen: el rol Administrador del sistema recibe el permiso
-- nuevo (los negocios nuevos lo reciben al registrarse, con todos los permisos).
INSERT INTO "RolePermission" ("id", "tenantId", "roleId", "permission")
SELECT md5(random()::text || clock_timestamp()::text || r."id"), r."tenantId", r."id", 'RECEPCION_ANULAR'
FROM "Role" r
WHERE r."esSistema" = true
ON CONFLICT ("roleId", "permission") DO NOTHING;
