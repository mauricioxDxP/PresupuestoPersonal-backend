import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Controller('api')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Get('test')
  test() {
    return [{ id: 'test', nombre: 'Test', tipo: 'ingreso' }];
  }

  @Post('categorias')
  create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriasService.create(createCategoriaDto);
  }

  @Get('categorias')
  findAll(@Query('tipo') tipo?: string) {
    try{

      return this.categoriasService.findAll(tipo);
    }
    catch(e)
    {
      console.log(e)
    }
  }

  @Get('categorias/:id')
  findOne(@Param('id') id: string) {
    return this.categoriasService.findOne(id);
  }

  @Patch('categorias/:id')
  update(@Param('id') id: string, @Body() updateCategoriaDto: UpdateCategoriaDto) {
    // Forzar conversión de orden a número (viene como string del frontend)
    const body = updateCategoriaDto as any;
    if (body.orden !== undefined && body.orden !== null) {
      body.orden = Number(body.orden);
    }
    return this.categoriasService.update(id, body);
  }

  @Delete('categorias/:id')
  remove(@Param('id') id: string) {
    return this.categoriasService.remove(id);
  }
}
