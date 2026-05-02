import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { MotivosService } from './motivos.service';
import { CreateMotivoDto } from './dto/create-motivo.dto';
import { UpdateMotivoDto } from './dto/update-motivo.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@Controller('motivos')
@UseGuards(JwtAuthGuard)
export class MotivosController {
  constructor(private readonly motivosService: MotivosService) {}

  @Post()
  create(@Body() createMotivoDto: CreateMotivoDto, @Request() req: any) {
    return this.motivosService.create(createMotivoDto, req.user);
  }

  @Get()
  findAll(@Query('categoriaId') categoriaId?: string, @Request() req?: any) {
    const xCasaId = req?.headers?.['x-casa-id'];
    return this.motivosService.findAll(categoriaId, req?.user, xCasaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.motivosService.findOne(id, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMotivoDto: UpdateMotivoDto, @Request() req: any) {
    return this.motivosService.update(id, updateMotivoDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.motivosService.remove(id, req.user);
  }

  @Patch('reorder')
  reorder(@Body() motivos: { id: string; orden: number }[], @Request() req: any) {
    return this.motivosService.reorder(motivos, req.user);
  }
}
