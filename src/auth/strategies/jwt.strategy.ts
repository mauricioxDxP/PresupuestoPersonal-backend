import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, Rol } from '../../common/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(ConfigService) private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.email || !payload.rol) {
      throw new UnauthorizedException('Token inválido');
    }

    return {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol as Rol,
      casaIds: payload.casaIds || [],
      nombre: payload.nombre || '',
    };
  }
}