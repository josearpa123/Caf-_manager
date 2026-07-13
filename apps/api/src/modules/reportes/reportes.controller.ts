import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Modulo, Permission } from '@prisma/client';
import { ReportesService } from './reportes.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModulo } from '../../common/decorators/require-modulo.decorator';
import { QueryReportesDto } from './dto/query-reportes.dto';
import { QueryCortesDto } from './dto/query-cortes.dto';

@Controller('reportes')
@RequireModulo(Modulo.REPORTES)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @RequirePermissions(Permission.REPORTES_VER)
  @Get('dashboard')
  dashboard(@Query() query: QueryReportesDto) {
    return this.reportesService.dashboard(query);
  }

  @RequirePermissions(Permission.REPORTES_VER)
  @Get('cortes')
  cortes(@Query() query: QueryCortesDto) {
    return this.reportesService.cortes(query);
  }

  @RequirePermissions(Permission.REPORTES_EXPORTAR)
  @Get('compras/exportar')
  async exportarCompras(@Query() query: QueryReportesDto, @Res() res: Response) {
    const csv = await this.reportesService.exportarComprasCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="compras.csv"');
    res.send(csv);
  }

  @RequirePermissions(Permission.REPORTES_EXPORTAR)
  @Get('exportar')
  async exportarExcel(@Query() query: QueryReportesDto, @Res() res: Response) {
    const buffer = await this.reportesService.exportarExcel(query);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="reportes.xlsx"');
    res.send(Buffer.from(buffer));
  }
}
