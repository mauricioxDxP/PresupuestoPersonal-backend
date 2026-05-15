import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, Res } from '@nestjs/common';
import { TransaccionesService } from './transacciones.service';
import { ReportesService } from '../reportes/reportes.service';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { UpdateTransaccionDto } from './dto/update-transaccion.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { Response } from 'express';

@Controller('transacciones')
@UseGuards(JwtAuthGuard)
export class TransaccionesController {
  constructor(
    private readonly transaccionesService: TransaccionesService,
    private readonly reportesService: ReportesService,
  ) {}

  @Post()
  create(@Body() createTransaccionDto: CreateTransaccionDto, @Request() req: any) {
    return this.transaccionesService.create(createTransaccionDto, req.user);
  }

  @Get()
  findAll(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('motivoId') motivoId?: string,
    @Query('moneda') moneda?: string,
    @Query('billetera') billetera?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const xCasaId = req?.headers?.['x-casa-id'];
    return this.transaccionesService.findAll(
      { fechaInicio, fechaFin, categoriaId, motivoId, moneda, billetera },
      { page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined },
      req?.user,
      xCasaId,
    );
  }

  @Get('reportes')
  getReportes(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('motivoId') motivoId?: string,
    @Query('moneda') moneda?: string,
    @Query('billetera') billetera?: string,
    @Request() req?: any,
  ) {
    const xCasaId = req?.headers?.['x-casa-id'];
    return this.transaccionesService.getReportes(
      { fechaInicio, fechaFin, categoriaId, motivoId, moneda, billetera },
      req?.user,
      xCasaId,
    );
  }

@Get('reporte-mensual/excel/:formato')
  async getReporteMensualExcel(
    @Param('formato') formato: 'mensual' | 'semanal',
    @Query('anio') anio: string,
    @Query('mes') mes: string,
    @Request() req: any,
    @Res() res: Response,
    @Query('moneda') moneda?: string,
    @Query('billetera') billetera?: string,
  ) {
    const xCasaId = req?.headers?.['x-casa-id'];
    const includeEmpty = req?.query?.includeEmpty === 'true';

    const filters = { moneda, billetera };
    const data = await this.transaccionesService.getReporteMensual(
      parseInt(anio),
      parseInt(mes),
      req?.user,
      xCasaId,
      filters,
    );

    let buffer: Buffer;
    let filename: string;

    if (formato === 'semanal') {
      // Transformar transacciones para que monto sea number|string y fecha sea string
      const transaccionesTransformadas = data.transacciones.map((t: any) => ({
        ...t,
        monto: Number(t.monto),
        fecha: t.fecha instanceof Date ? t.fecha.toISOString() : String(t.fecha),
      }));
      buffer = await this.reportesService.generateReporteTwo(
        transaccionesTransformadas,
        data.categorias,
        data.motivos,
        data.nombreMes,
        includeEmpty,
      );
      filename = `reporte_2_${data.nombreMes.replace(/\s/g, '_')}.xlsx`;
    } else {
      // Mensual - usar función existente del frontend (por ahora devolvemos error)
      res.status(501).json({ message: 'Reporte mensual aún no implementado en backend' });
      return;
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('reporte-mensual')
  getReporteMensual(
    @Query('anio') anio: string,
    @Query('mes') mes: string,
    @Request() req: any,
    @Query('moneda') moneda?: string,
    @Query('billetera') billetera?: string,
  ) {
    const xCasaId = req?.headers?.['x-casa-id'];
    const filters = { moneda, billetera };
    return this.transaccionesService.getReporteMensual(parseInt(anio), parseInt(mes), req?.user, xCasaId, filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.transaccionesService.findOne(id, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTransaccionDto: UpdateTransaccionDto, @Request() req: any) {
    return this.transaccionesService.update(id, updateTransaccionDto, req.user);
  }

  @Get(':id/historial')
  getHistorial(@Param('id') id: string) {
    return this.transaccionesService.getHistorial(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.transaccionesService.remove(id, req.user);
  }
}
