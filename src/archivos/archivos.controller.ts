import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ArchivosService } from './archivos.service';
import { CreateArchivoDto } from './dto/create-archivo.dto';

@Controller('api/archivos')
export class ArchivosController {
  constructor(private readonly archivosService: ArchivosService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    })
  )
  upload(@UploadedFile() file: Express.Multer.File, @Body('transaccionId') transaccionId: string) {
    return this.archivosService.upload(file, transaccionId);
  }

  @Get()
  findAll(@Query('transaccionId') transaccionId?: string) {
    return this.archivosService.findAll(transaccionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.archivosService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.archivosService.remove(id);
  }
}
