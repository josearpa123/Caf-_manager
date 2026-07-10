import { BadRequestException, Injectable } from '@nestjs/common';
import { ProveedorTecnologicoFacturacion } from '@prisma/client';
import type { FacturacionProviderAdapter } from './facturacion-provider.interface';
import { NingunoFacturacionProvider } from './ninguno.provider';

@Injectable()
export class FacturacionProviderFactory {
  constructor(private readonly ninguno: NingunoFacturacionProvider) {}

  resolve(proveedor: ProveedorTecnologicoFacturacion): FacturacionProviderAdapter {
    switch (proveedor) {
      case ProveedorTecnologicoFacturacion.NINGUNO:
        return this.ninguno;
      case ProveedorTecnologicoFacturacion.FACTUS:
      case ProveedorTecnologicoFacturacion.SIIGO:
        // Para conectar: crear una clase que implemente
        // FacturacionProviderAdapter (ver ninguno.provider.ts como
        // plantilla), agregarla a los providers de FacturacionModule, e
        // instanciarla aquí. El resto del módulo no cambia.
        throw new BadRequestException(
          `El conector para ${proveedor} todavía no está implementado.`,
        );
      default:
        throw new BadRequestException('Proveedor de facturación no reconocido');
    }
  }
}
