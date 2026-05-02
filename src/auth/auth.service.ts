import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtPayload, Rol } from '../common/types';

@Injectable()
export class AuthService {
  private prisma: PrismaClient;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.usuario.findUnique({
      where: { email, eliminado: false },
      include: { 
        casas: {
          include: { casa: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Este usuario usa autenticación con Google');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const casaIds = user.casas.map(uc => uc.casaId);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      rol: user.rol as Rol,
      casaIds,
      nombre: user.nombre,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        casas: user.casas.map(uc => ({
          id: uc.casa.id,
          nombre: uc.casa.nombre,
          rol: uc.rol,
        })),
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, nombre } = registerDto;

    const existingUser = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.usuario.create({
      data: {
        email,
        passwordHash,
        nombre,
        rol: Rol.USUARIO,
        // No se le asigna casa - debe esperar a que un ADMIN le asigne una
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      rol: user.rol as Rol,
      casaIds: [],
      nombre: user.nombre,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        casas: [],
      },
    };
  }

  async googleAuth(googleAuthDto: GoogleAuthDto) {
    const { googleToken, casaId } = googleAuthDto;

    // Verify the Google token
    const googlePayload = await this.verifyGoogleToken(googleToken);
    const googleId = googlePayload.sub;
    const email = googlePayload.email;

    if (!email) {
      throw new UnauthorizedException('No se pudo obtener el email de Google');
    }

    // Check if user already exists with this Google ID
    let user = await this.prisma.usuario.findUnique({
      where: { googleId },
      include: {
        casas: {
          include: { casa: true },
        },
      },
    });

    if (user) {
      // Existing user logging in with Google
      const casaIds = user.casas.map(uc => uc.casaId);
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        rol: user.rol as Rol,
        casaIds,
        nombre: user.nombre,
      };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          casas: user.casas.map(uc => ({
            id: uc.casa.id,
            nombre: uc.casa.nombre,
            rol: uc.rol,
          })),
        },
      };
    }

    // New user - must specify a casaId
    if (!casaId) {
      throw new UnauthorizedException('Debes especificar una casa para registrarte');
    }

    const casa = await this.prisma.casa.findUnique({
      where: { id: casaId },
    });

    if (!casa) {
      throw new UnauthorizedException('Casa no encontrada');
    }

    user = await this.prisma.usuario.create({
      data: {
        email,
        googleId,
        nombre: googlePayload.nombre || email.split('@')[0],
        casas: {
          create: {
            casaId,
            rol: Rol.USUARIO,
          },
        },
      },
      include: {
        casas: {
          include: { casa: true },
        },
      },
    });

    const newCasaIds = user.casas.map(uc => uc.casaId);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      rol: user.rol as Rol,
      casaIds: newCasaIds,
      nombre: user.nombre,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        casas: user.casas.map(uc => ({
          id: uc.casa.id,
          nombre: uc.casa.nombre,
          rol: uc.rol,
        })),
      },
    };
  }

  private async verifyGoogleToken(token: string): Promise<any> {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'));

    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      return ticket.getPayload();
    } catch (error) {
      throw new UnauthorizedException('Token de Google inválido');
    }
  }
}
