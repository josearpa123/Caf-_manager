import { AccionAuditoria, Prisma } from '@prisma/client';

// Modelos financieramente sensibles cuyos create/update/delete quedan
// registrados automáticamente en AuditLog, sin anotar cada endpoint.
// Ampliar cobertura a futuro es agregar el nombre del modelo aquí.
const AUDITED_MODELS = new Set([
  'Recepcion',
  'TablaPrecioTramo',
  'Pago',
  'Factura',
  'Anticipo',
  'ConciliacionAnticipo',
  'Venta',
]);

const toClientProp = (model: string) =>
  model.charAt(0).toLowerCase() + model.slice(1);

// Se compone SIEMPRE después de tenantScopingExtension (ver
// tenant-prisma.provider.ts), así que sus propias escrituras a `auditLog`
// también quedan tenant-scoped automáticamente. Solo cubre create/update/delete
// simples con un `id` único resultante — updateMany/deleteMany sobre modelos
// auditados (sin un entidadId único) no quedan cubiertos aquí, usar
// AuditService.log(...) manualmente para esos casos (ver common/audit).
export function auditLogExtension(tenantId: string, userId: string | null) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'audit-log',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!model || !AUDITED_MODELS.has(model)) {
              return query(args);
            }

            if (operation === 'create') {
              const result = (await query(args)) as { id: string };
              await client.auditLog.create({
                data: {
                  tenantId,
                  userId,
                  entidad: model,
                  entidadId: result.id,
                  accion: AccionAuditoria.CREAR,
                  datosNuevos: result as unknown as Prisma.InputJsonValue,
                },
              });
              return result;
            }

            if (operation === 'update' || operation === 'delete') {
              const prop = toClientProp(model) as keyof typeof client;
              const modelClient = client[prop] as unknown as {
                findUnique: (a: {
                  where: Record<string, unknown>;
                }) => Promise<{ id: string } | null>;
              };
              const before = await modelClient.findUnique({
                where: (args as { where: Record<string, unknown> }).where,
              });
              const result = (await query(args)) as { id: string } | null;
              await client.auditLog.create({
                data: {
                  tenantId,
                  userId,
                  entidad: model,
                  entidadId: (before?.id ?? result?.id) as string,
                  accion:
                    operation === 'delete'
                      ? AccionAuditoria.ELIMINAR
                      : AccionAuditoria.EDITAR,
                  datosAnteriores: before as unknown as Prisma.InputJsonValue,
                  datosNuevos:
                    operation === 'delete'
                      ? undefined
                      : (result as unknown as Prisma.InputJsonValue),
                },
              });
              return result;
            }

            return query(args);
          },
        },
      },
    }),
  );
}
