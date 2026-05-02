import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {

  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || '';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || '';
    const isConfigured = !!(clientID && clientSecret);

    super({
      clientID: clientID || 'DUMMY',
      clientSecret: clientSecret || 'DUMMY',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '/auth/google/callback',
      scope: ['email', 'profile'],
    });

    if (!isConfigured) {
      Logger.warn('⚠️ Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env', 'GoogleStrategy');
    }
    (this as any).googleConfigured = isConfigured;
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    if (!(this as any).googleConfigured) {
      done(new Error('Google OAuth not configured'), undefined);
      return;
    }

    const { id, displayName, emails } = profile;
    const email = emails?.[0]?.value;

    const user = {
      googleId: id,
      email,
      nombre: displayName || email,
      accessToken,
    };

    done(null, user);
  }
}