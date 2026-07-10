import { Prisma } from '@prisma/client';
import {
  READ_OPS,
  TENANT_SCOPED_MODELS,
  WHERE_WRITE_OPS,
} from './scoped-models';

// Intercepta TODAS las queries de Prisma e inyecta automáticamente el filtro
// de tenant, para que ningún módulo de negocio tenga que acordarse de
// agregarlo manualmente. Es el único punto de control del aislamiento entre
// tenants — un descuido aquí es la única forma de fuga de datos entre
// clientes, así que cualquier cambio a este archivo debe revisarse con
// cuidado.
//
// Caveats importantes:
// - $queryRaw/$executeRaw NO pasan por $allOperations — nunca usarlos sobre
//   modelos tenant-scoped sin agregar `tenantId` manualmente al SQL.
// - Las escrituras anidadas de Prisma (ej. `user.create({data:{roles:{create:[...]}}})`)
//   no se interceptan como operaciones de modelo separadas. Para creaciones
//   multi-modelo usar `$transaction` con llamadas explícitas por modelo.
export function tenantScopingExtension(tenantId: string) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'tenant-scoping',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (model === 'Tenant') {
              if (READ_OPS.has(operation) || WHERE_WRITE_OPS.has(operation)) {
                (args as { where?: Record<string, unknown> }).where = {
                  ...((args as { where?: Record<string, unknown> }).where ??
                    {}),
                  id: tenantId,
                };
              }
              return query(args);
            }

            if (!model || !TENANT_SCOPED_MODELS.has(model)) {
              return query(args); // pass-through: modelos sin tenantId propio
            }

            const scopedArgs = args as {
              where?: Record<string, unknown>;
              data?: Record<string, unknown> | Record<string, unknown>[];
            };

            if (READ_OPS.has(operation) || WHERE_WRITE_OPS.has(operation)) {
              scopedArgs.where = { ...(scopedArgs.where ?? {}), tenantId };
            }

            if (operation === 'create') {
              scopedArgs.data = {
                ...(scopedArgs.data as Record<string, unknown>),
                tenantId,
              };
            }

            if (operation === 'createMany' && Array.isArray(scopedArgs.data)) {
              scopedArgs.data = scopedArgs.data.map((d) => ({
                ...d,
                tenantId,
              }));
            }

            return query(scopedArgs);
          },
        },
      },
    }),
  );
}
