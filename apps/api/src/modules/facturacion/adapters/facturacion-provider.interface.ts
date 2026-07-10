// Contrato que debe implementar cualquier conector real (Factus, Siigo, u
// otro) para poder emitir/anular facturas ante la DIAN. Mientras no se
// decida el proveedor (ver docs/requerimientos.md), el único registrado es
// NingunoFacturacionProvider, que rechaza con un mensaje claro en vez de
// simular una emisión. Conectar un proveedor real es: implementar esta
// interfaz + registrar el provider en FacturacionProviderFactory — no
// requiere tocar FacturacionService ni el resto del módulo.
export interface FacturaParaEmitir {
  id: string;
  recepcion: {
    codigo: string;
    valorTotal: unknown; // Prisma.Decimal
    proveedor: { nombre: string; numeroIdentificacion: string };
  };
  puntoCompra: { nombre: string };
}

export interface EmitirFacturaResult {
  numero: number;
  cufe: string;
  urlPdf?: string;
  urlXml?: string;
  payloadResponse?: unknown;
}

export interface FacturacionProviderAdapter {
  emitir(factura: FacturaParaEmitir): Promise<EmitirFacturaResult>;
  anular(factura: FacturaParaEmitir & { cufe: string }, motivo: string): Promise<void>;
}
