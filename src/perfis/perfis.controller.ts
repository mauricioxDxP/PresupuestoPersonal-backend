import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PerfisService } from './perfis.service';
import { CreatePerfilDto, UpdatePerfilDto, AssignPerfilPermisoDto } from './dto/perfis.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('perfis')
export class PerfisController {
  constructor(private readonly perfisService: PerfisService) {}

  @Post()
  create(@Body() createPerfilDto: CreatePerfilDto, @Req() req: Request) {
    return this.perfisService.create(createPerfilDto, req.user);
  }

  @Get()
  findAll(@Query('casaId') casaId: string, @Req() req: Request) {
    return this.perfisService.findAll(casaId, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.perfisService.findOne(id, req.user);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updatePerfilDto: UpdatePerfilDto,
    @Req() req: Request,
  ) {
    return this.perfisService.update(id, updatePerfilDto, req.user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: Request) {
    return this.perfisService.delete(id, req.user);
  }

  @Post(':id/clone')
  clone(@Param('id') id: string, @Req() req: Request) {
    return this.perfisService.clone(id, req.user);
  }

  @Post(':id/permisos/categoria')
  assignCategoriaPermiso(
    @Param('id') id: string,
    @Body() assignPermisoDto: AssignPerfilPermisoDto,
    @Req() req: Request,
  ) {
    return this.perfisService.assignCategoriaPermiso(id, assignPermisoDto, req.user);
  }

  @Post(':id/permisos/motivo')
  assignMotivoPermiso(
    @Param('id') id: string,
    @Body() assignPermisoDto: AssignPerfilPermisoDto,
    @Req() req: Request,
  ) {
    return this.perfisService.assignMotivoPermiso(id, assignPermisoDto, req.user);
  }
}