import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TransaccionesService } from './transacciones.service';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { UpdateTransaccionDto } from './dto/update-transaccion.dto';

@Controller('api/transacciones')
export class TransaccionesController {
  constructor(private readonly transaccionesService: TransaccionesService) {}

  @Post()
  create(@Body() createTransaccionDto: CreateTransaccionDto) {
    return this.transaccionesService.create(createTransaccionDto);
  }

  @Get()
  findAll(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('motivoId') motivoId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.transaccionesService.findAll(
      { fechaInicio, fechaFin, categoriaId, motivoId },
      { page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined }
    );
  }

  @Get('reportes')
  getReportes() {
    return this.transaccionesService.getReportes();
  }

  @Get('reporte-mensual')
  getReporteMensual(
    @Query('anio') anio: string,
    @Query('mes') mes: string,
  ) {
    return this.transaccionesService.getReporteMensual(parseInt(anio), parseInt(mes));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transaccionesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTransaccionDto: UpdateTransaccionDto) {
    return this.transaccionesService.update(id, updateTransaccionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transaccionesService.remove(id);
  }
}
