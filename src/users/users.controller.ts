import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignPermisosDto, AssignMotivoPermisosDto, AssignCasaDto, AssignPerfilDto } from './dto/users.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesPorCasaGuard } from '../auth/guards/roles-por-casa.guard';
import { RolesPorCasa } from '../auth/decorators/roles.decorator';
import { Rol } from '../common/types';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesPorCasaGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  create(@Body() createUserDto: CreateUserDto, @Query('casaId') casaId: string, @Request() req: any) {
    return this.usersService.create(createUserDto, casaId, req.user);
  }

  @Get()
  getAll(@Query('casaId') casaId: string, @Request() req: any) {
    return this.usersService.findAll(casaId, req.user);
  }

  @Get('me/permisos')
  getMyPermisos(@Request() req: any) {
    return this.usersService.getMyPermisos(req.user.id, req.user, req.headers['x-casa-id']);
  }

  @Get('me/perfil')
  getMyPerfil(@Request() req: any, @Query('casaId') casaId: string) {
    return this.usersService.getUserPerfil(req.user.id, casaId, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.usersService.findOne(id, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: any) {
    return this.usersService.update(id, updateUserDto, req.user);
  }

  @Delete(':id')
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.usersService.remove(id, req.user);
  }

  @Post(':usuarioId/permisos/categoria')
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  assignCategoriaPermiso(
    @Param('usuarioId') usuarioId: string,
    @Body() assignPermisosDto: AssignPermisosDto,
    @Request() req: any,
  ) {
    return this.usersService.assignCategoriaPermiso(usuarioId, assignPermisosDto, req.user);
  }

  @Post(':usuarioId/permisos/motivo')
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  assignMotivoPermiso(
    @Param('usuarioId') usuarioId: string,
    @Body() assignMotivoPermisosDto: AssignMotivoPermisosDto,
    @Request() req: any,
  ) {
    return this.usersService.assignMotivoPermiso(usuarioId, assignMotivoPermisosDto, req.user);
  }

  // Casa management endpoints (for multi-casa maestro)
  @Get(':usuarioId/casas')
  getUserCasas(@Param('usuarioId') usuarioId: string, @Request() req: any) {
    return this.usersService.getUserCasas(usuarioId);
  }

  @Post(':usuarioId/casas')
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  assignCasa(
    @Param('usuarioId') usuarioId: string,
    @Body() assignCasaDto: AssignCasaDto,
    @Request() req: any,
  ) {
    return this.usersService.assignCasa(usuarioId, assignCasaDto, req.user);
  }

  @Delete(':usuarioId/casas/:casaId')
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  removeCasa(
    @Param('usuarioId') usuarioId: string,
    @Param('casaId') casaId: string,
    @Request() req: any,
  ) {
    return this.usersService.removeCasa(usuarioId, casaId, req.user);
  }

  // Profile (Perfil de Permisos) management
  @Post(':usuarioId/perfil')
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  assignPerfil(
    @Param('usuarioId') usuarioId: string,
    @Body() assignPerfilDto: AssignPerfilDto,
    @Request() req: any,
  ) {
    return this.usersService.assignPerfil(usuarioId, assignPerfilDto.perfilId, assignPerfilDto.casaId, req.user);
  }

  @Get(':usuarioId/perfil')
  getUserPerfil(
    @Param('usuarioId') usuarioId: string,
    @Query('casaId') casaId: string,
    @Request() req: any,
  ) {
    return this.usersService.getUserPerfil(usuarioId, casaId, req.user);
  }

  @Delete(':usuarioId/perfil')
  @RolesPorCasa(Rol.MAESTRO_CASA, Rol.ADMIN)
  removePerfil(
    @Param('usuarioId') usuarioId: string,
    @Query('casaId') casaId: string,
    @Request() req: any,
  ) {
    return this.usersService.removePerfil(usuarioId, casaId, req.user);
  }
}