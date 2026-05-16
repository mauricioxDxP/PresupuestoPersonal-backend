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
import { RolesPorCasaGuard } from '../auth/guards/roles-por-casa.guard';
import { RolesPorCasa } from '../auth/decorators/roles.decorator';
import { Rol } from '../common/types';

@UseGuards(JwtAuthGuard, RolesPorCasaGuard)
@Controller('perfis')
export class PerfisController {
  constructor(private readonly perfisService: PerfisService) {}

  @Post()
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  create(@Body() createPerfilDto: CreatePerfilDto, @Req() req: Request) {
    return this.perfisService.create(createPerfilDto, req.user);
  }

  @Get()
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  findAll(@Query('casaId') casaId: string, @Req() req: Request) {
    return this.perfisService.findAll(casaId, req.user);
  }

  @Get(':id')
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.perfisService.findOne(id, req.user);
  }

  @Put(':id')
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updatePerfilDto: UpdatePerfilDto,
    @Req() req: Request,
  ) {
    return this.perfisService.update(id, updatePerfilDto, req.user);
  }

  @Delete(':id')
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  delete(@Param('id') id: string, @Req() req: Request) {
    return this.perfisService.delete(id, req.user);
  }

  @Post(':id/clone')
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  clone(@Param('id') id: string, @Req() req: Request) {
    return this.perfisService.clone(id, req.user);
  }

  @Post(':id/permisos/categoria')
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  assignCategoriaPermiso(
    @Param('id') id: string,
    @Body() assignPermisoDto: AssignPerfilPermisoDto,
    @Req() req: Request,
  ) {
    return this.perfisService.assignCategoriaPermiso(id, assignPermisoDto, req.user);
  }

  @Post(':id/permisos/motivo')
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  assignMotivoPermiso(
    @Param('id') id: string,
    @Body() assignPermisoDto: AssignPerfilPermisoDto,
    @Req() req: Request,
  ) {
    return this.perfisService.assignMotivoPermiso(id, assignPermisoDto, req.user);
  }
}