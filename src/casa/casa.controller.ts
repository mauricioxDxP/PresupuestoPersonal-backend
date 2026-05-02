import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query, Request, Patch } from '@nestjs/common';
import { CasaService } from './casa.service';
import { CreateCasaDto } from './dto/create-casa.dto';
import { UpdateCasaDto } from './dto/update-casa.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '../common/types';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('casas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CasaController {
  constructor(private readonly casaService: CasaService) {}

  @Post()
  @Roles(Rol.ADMIN)
  create(@Body() createCasaDto: CreateCasaDto) {
    return this.casaService.create(createCasaDto);
  }

  @Get()
  @Roles(Rol.ADMIN)
  findAll() {
    return this.casaService.findAll();
  }

  @Get(':id')
  @Roles(Rol.ADMIN)
  findOne(@Param('id') id: string) {
    return this.casaService.findOne(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN)
  update(@Param('id') id: string, @Body() updateCasaDto: UpdateCasaDto) {
    return this.casaService.update(id, updateCasaDto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  remove(@Param('id') id: string) {
    return this.casaService.remove(id);
  }

  @Post(':casaId/usuarios')
  @Roles(Rol.ADMIN, Rol.MAESTRO_CASA)
  assignUsuario(
    @Param('casaId') casaId: string,
    @Body() body: { usuarioId: string; rol?: string },
    @Request() req: any,
  ) {
    // MAESTRO_CASA can only assign users to their own casa
    const user = req.user;
    if (user.rol !== Rol.ADMIN && !user.casaIds?.includes(casaId)) {
      return { statusCode: 403, message: 'No tienes permisos para asignar usuarios a esta casa' };
    }
    return this.casaService.assignUsuario(casaId, body.usuarioId, body.rol as Rol);
  }

  @Delete(':casaId/usuarios/:usuarioId')
  @Roles(Rol.ADMIN, Rol.MAESTRO_CASA)
  removeUsuario(
    @Param('casaId') casaId: string,
    @Param('usuarioId') usuarioId: string,
    @Request() req: any,
  ) {
    // MAESTRO_CASA can only remove users from their own casa
    const user = req.user;
    if (user.rol !== Rol.ADMIN && !user.casaIds?.includes(casaId)) {
      return { statusCode: 403, message: 'No tienes permisos para quitar usuarios de esta casa' };
    }
    return this.casaService.removeUsuario(casaId, usuarioId);
  }
}