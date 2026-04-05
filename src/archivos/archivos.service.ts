import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class ArchivosService {
  private logger = new Logger(ArchivosService.name);
  private prisma: PrismaClient;
  private supabase: any;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    this.logger.log('ArchivosService created its own PrismaClient');
    this.initSupabase();
  }

  private initSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.logger.log('✅ Supabase client initialized');
    } else {
      this.logger.warn('⚠️ Supabase no configurado - uploads deshabilitados');
    }
  }

  async upload(file: Express.Multer.File, transaccionId: string) {
    if (!this.supabase) {
      throw new Error('Supabase no configurado');
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const bucket = 'archivos';

    // Subir archivo a Supabase Storage
    const { data, error } = await this.supabase.storage.from(bucket).upload(fileName, file.buffer, {
      contentType: file.mimetype,
    });

    if (error) {
      throw new Error(`Error al subir archivo: ${error.message}`);
    }

    // Obtener URL pública
    const { data: urlData } = await this.supabase.storage.from(bucket).getPublicUrl(fileName);

    // Determinar tipo
    let tipo = 'otro';
    if (file.mimetype.startsWith('image/')) {
      tipo = 'imagen';
    } else if (file.mimetype === 'application/pdf') {
      tipo = 'pdf';
    }

    // Guardar en base de datos
    return this.prisma.archivo.create({
      data: {
        tipo,
        nombre: file.originalname,
        url: urlData.publicUrl,
        transaccionId,
      },
    });
  }

  async findAll(transaccionId?: string) {
    const where: any = { eliminado: false };
    if (transaccionId) {
      where.transaccionId = transaccionId;
    }
    return this.prisma.archivo.findMany({
      where,
      include: { transaccion: true },
    });
  }

  async findOne(id: string) {
    const archivo = await this.prisma.archivo.findUnique({
      where: { id },
      include: { transaccion: true },
    });
    if (!archivo || archivo.eliminado) {
      throw new NotFoundException(`Archivo ${id} no encontrado`);
    }
    return archivo;
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft delete
    return this.prisma.archivo.update({
      where: { id },
      data: { eliminado: true },
    });
  }
}
