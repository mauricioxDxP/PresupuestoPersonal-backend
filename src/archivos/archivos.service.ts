import { Injectable, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Rol } from '../common/types';
import { requireMaestroCasaRol } from '../common/auth-helpers';

interface AuthUser {
  id: string;
  rol: Rol;
  casaIds: string[];
}

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

    this.logger.log(`📦 SUPABASE_URL: ${supabaseUrl ? 'CARGADA ✓' : 'VACÍA ✗'}`);
    this.logger.log(`📦 SUPABASE_KEY: ${supabaseKey ? 'CARGADA ✓' : 'VACÍA ✗'}`);

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.logger.log('✅ Supabase client initialized');
    } else {
      this.logger.warn('⚠️ Supabase no configurado - uploads deshabilitados');
    }
  }

  async upload(file: any, transaccionId: string, user?: AuthUser) {
    if (!this.supabase) {
      throw new Error('Supabase no configurado');
    }

    const transaccion = await this.prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: { casaId: true },
    });

    if (!transaccion) {
      throw new Error('Transacción no encontrada');
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const bucket = 'archivos';

    const { data, error } = await this.supabase.storage.from(bucket).upload(fileName, file.buffer, {
      contentType: file.mimetype,
    });

    if (error) {
      throw new Error(`Error al subir archivo: ${error.message}`);
    }

    const { data: urlData } = await this.supabase.storage.from(bucket).getPublicUrl(fileName);

    this.logger.log(`📎 Upload: ${file.originalname} (${file.mimetype}, ${file.buffer.length} bytes) -> ${urlData.publicUrl}`);

    let tipo = 'otro';
    if (file.mimetype.startsWith('image/')) {
      tipo = 'imagen';
    } else if (file.mimetype === 'application/pdf') {
      tipo = 'pdf';
    }

    return this.prisma.archivo.create({
      data: {
        tipo,
        nombre: file.originalname,
        url: urlData.publicUrl,
        transaccionId,
        casaId: transaccion.casaId,
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

  async remove(id: string, user?: AuthUser) {
    const archivo = await this.prisma.archivo.findUnique({
      where: { id },
      select: { id: true, casaId: true },
    });

    if (!archivo) {
      throw new NotFoundException(`Archivo ${id} no encontrado`);
    }

    await requireMaestroCasaRol(this.prisma, user!, archivo.casaId, 'eliminar archivos');

    return this.prisma.archivo.update({
      where: { id },
      data: { eliminado: true },
    });
  }
}