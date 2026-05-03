import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { TransaccionesService } from './transacciones.service';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { UpdateTransaccionDto } from './dto/update-transaccion.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@Controller('transacciones')
@UseGuards(JwtAuthGuard)
export class TransaccionesController {
  constructor(private readonly transaccionesService: TransaccionesService) {}

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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const xCasaId = req?.headers?.['x-casa-id'];
    return this.transaccionesService.findAll(
      { fechaInicio, fechaFin, categoriaId, motivoId },
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
    @Request() req?: any,
  ) {
    const xCasaId = req?.headers?.['x-casa-id'];
    return this.transaccionesService.getReportes(
      { fechaInicio, fechaFin, categoriaId, motivoId },
      req?.user,
      xCasaId,
    );
  }

@Get('reporte-mensual')
  getReporteMensual(
    @Query('anio') anio: string,
    @Query('mes') mes: string,
    @Request() req: any,
  ) {
    const xCasaId = req?.headers?.['x-casa-id'];
    return this.transaccionesService.getReporteMensual(parseInt(anio), parseInt(mes), req?.user, xCasaId);
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
