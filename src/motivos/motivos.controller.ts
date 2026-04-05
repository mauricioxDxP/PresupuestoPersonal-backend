import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MotivosService } from './motivos.service';
import { CreateMotivoDto } from './dto/create-motivo.dto';
import { UpdateMotivoDto } from './dto/update-motivo.dto';

@Controller('api/motivos')
export class MotivosController {
  constructor(private readonly motivosService: MotivosService) {}

  @Post()
  create(@Body() createMotivoDto: CreateMotivoDto) {
    return this.motivosService.create(createMotivoDto);
  }

  @Get()
  findAll(@Query('categoriaId') categoriaId?: string) {
    return this.motivosService.findAll(categoriaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.motivosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMotivoDto: UpdateMotivoDto) {
    return this.motivosService.update(id, updateMotivoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.motivosService.remove(id);
  }

  @Patch('reorder')
  reorder(@Body() motivos: { id: string; orden: number }[]) {
    return this.motivosService.reorder(motivos);
  }
}
