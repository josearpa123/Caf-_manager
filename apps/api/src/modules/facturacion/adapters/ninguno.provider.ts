import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  EmitirFacturaResult,
  FacturaParaEmitir,
  FacturacionProviderAdapter,
} from './facturacion-provider.interface';

const MENSAJE = (
  'No hay proveedor de facturación electrónica conectado para este tenant. ' +
  'Configure Factus o Siigo (pendiente de decisión, ver docs/requerimientos.md) ' +
  'para poder emitir facturas ante la DIAN.'
);

@Injectable()
export class NingunoFacturacionProvider implements FacturacionProviderAdapter {
  emitir(_factura: FacturaParaEmitir): Promise<EmitirFacturaResult> {
    throw new BadRequestException(MENSAJE);
  }

  anular(_factura: FacturaParaEmitir & { cufe: string }, _motivo: string): Promise<void> {
    throw new BadRequestException(MENSAJE);
  }
}
