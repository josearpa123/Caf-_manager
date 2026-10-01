-- CreateEnum
CREATE TYPE "TipoConsecutivo" AS ENUM ('RECEPCION', 'SECADO', 'TRILLA', 'PRESTAMO', 'VENTA', 'CONTRATO_VENTA', 'VIAJE');

-- CreateTable
CREATE TABLE "Consecutivo" (
    "tenantId" TEXT NOT NULL,
    "tipo" "TipoConsecutivo" NOT NULL,
    "anio" INTEGER NOT NULL,
    "prefijo" TEXT NOT NULL,
    "valorActual" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consecutivo_pkey" PRIMARY KEY ("tenantId","tipo","anio")
);

-- AddForeignKey
ALTER TABLE "Consecutivo" ADD CONSTRAINT "Consecutivo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Siembra: el contador parte del mayor consecutivo ya emitido por tenant y año,
-- para no repetir códigos existentes.
INSERT INTO "Consecutivo" ("tenantId", "tipo", "anio", "prefijo", "valorActual", "updatedAt")
SELECT "tenantId", 'RECEPCION'::"TipoConsecutivo",
       substring("codigo" from '^REC-([0-9]{4})-')::int,
       'REC',
       max(substring("codigo" from '([0-9]+)$')::int),
       now()
FROM "Recepcion"
WHERE "codigo" ~ '^REC-[0-9]{4}-[0-9]+$'
GROUP BY "tenantId", substring("codigo" from '^REC-([0-9]{4})-')::int;

INSERT INTO "Consecutivo" ("tenantId", "tipo", "anio", "prefijo", "valorActual", "updatedAt")
SELECT "tenantId", 'SECADO'::"TipoConsecutivo",
       substring("codigo" from '^SEC-([0-9]{4})-')::int,
       'SEC',
       max(substring("codigo" from '([0-9]+)$')::int),
       now()
FROM "ProcesoSecado"
WHERE "codigo" ~ '^SEC-[0-9]{4}-[0-9]+$'
GROUP BY "tenantId", substring("codigo" from '^SEC-([0-9]{4})-')::int;

INSERT INTO "Consecutivo" ("tenantId", "tipo", "anio", "prefijo", "valorActual", "updatedAt")
SELECT "tenantId", 'TRILLA'::"TipoConsecutivo",
       substring("codigo" from '^TRI-([0-9]{4})-')::int,
       'TRI',
       max(substring("codigo" from '([0-9]+)$')::int),
       now()
FROM "TrillaProceso"
WHERE "codigo" ~ '^TRI-[0-9]{4}-[0-9]+$'
GROUP BY "tenantId", substring("codigo" from '^TRI-([0-9]{4})-')::int;

INSERT INTO "Consecutivo" ("tenantId", "tipo", "anio", "prefijo", "valorActual", "updatedAt")
SELECT "tenantId", 'PRESTAMO'::"TipoConsecutivo",
       substring("codigo" from '^PRE-([0-9]{4})-')::int,
       'PRE',
       max(substring("codigo" from '([0-9]+)$')::int),
       now()
FROM "Prestamo"
WHERE "codigo" ~ '^PRE-[0-9]{4}-[0-9]+$'
GROUP BY "tenantId", substring("codigo" from '^PRE-([0-9]{4})-')::int;

INSERT INTO "Consecutivo" ("tenantId", "tipo", "anio", "prefijo", "valorActual", "updatedAt")
SELECT "tenantId", 'VENTA'::"TipoConsecutivo",
       substring("codigo" from '^VTA-([0-9]{4})-')::int,
       'VTA',
       max(substring("codigo" from '([0-9]+)$')::int),
       now()
FROM "Venta"
WHERE "codigo" ~ '^VTA-[0-9]{4}-[0-9]+$'
GROUP BY "tenantId", substring("codigo" from '^VTA-([0-9]{4})-')::int;

INSERT INTO "Consecutivo" ("tenantId", "tipo", "anio", "prefijo", "valorActual", "updatedAt")
SELECT "tenantId", 'CONTRATO_VENTA'::"TipoConsecutivo",
       substring("codigo" from '^CTR-([0-9]{4})-')::int,
       'CTR',
       max(substring("codigo" from '([0-9]+)$')::int),
       now()
FROM "ContratoVenta"
WHERE "codigo" ~ '^CTR-[0-9]{4}-[0-9]+$'
GROUP BY "tenantId", substring("codigo" from '^CTR-([0-9]{4})-')::int;

INSERT INTO "Consecutivo" ("tenantId", "tipo", "anio", "prefijo", "valorActual", "updatedAt")
SELECT "tenantId", 'VIAJE'::"TipoConsecutivo",
       substring("codigo" from '^CORTE-([0-9]{4})-')::int,
       'CORTE',
       max(substring("codigo" from '([0-9]+)$')::int),
       now()
FROM "Viaje"
WHERE "codigo" ~ '^CORTE-[0-9]{4}-[0-9]+$'
GROUP BY "tenantId", substring("codigo" from '^CORTE-([0-9]{4})-')::int;

