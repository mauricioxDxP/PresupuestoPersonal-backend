import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { CasaIsolationService } from '../common/middleware/casa-isolation.service';

@Controller('categorias')
@UseGuards(JwtAuthGuard)
export class CategoriasController {
  constructor(
    private readonly categoriasService: CategoriasService,
    private readonly casaIsolation: CasaIsolationService,
  ) {}

  @Post()
  create(@Body() createCategoriaDto: CreateCategoriaDto, @Request() req: any) {
    return this.categoriasService.create(createCategoriaDto, req.user);
  }

  @Get()
  findAll(@Query('tipo') tipo?: string, @Request() req?: any) {
    try {
      // Pass x-casa-id header to service for filtering
      const xCasaId = req?.headers?.['x-casa-id'];
      return this.categoriasService.findAll(tipo, req?.user, xCasaId);
    } catch (e) {
      console.log(e);
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.categoriasService.findOne(id, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoriaDto: UpdateCategoriaDto, @Request() req: any) {
    const body = updateCategoriaDto as any;
    if (body.orden !== undefined && body.orden !== null) {
      body.orden = Number(body.orden);
    }
    return this.categoriasService.update(id, body, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.categoriasService.remove(id, req.user);
  }
}
