import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Permission } from '@prisma/client';
import { ReportesService } from './reportes.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { QueryReportesDto } from './dto/query-reportes.dto';

@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @RequirePermissions(Permission.REPORTES_VER)
  @Get('dashboard')
  dashboard(@Query() query: QueryReportesDto) {
    return this.reportesService.dashboard(query);
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
