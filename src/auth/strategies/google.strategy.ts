import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AppConfigService } from '../../config/app-config.service';

export interface GoogleOAuthUser {
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
  provider: 'google';
  providerId: string;
  emailVerified: boolean;
}

interface GoogleProfile {
  id: string;
  emails?: { value?: string; verified?: boolean }[];
  name?: { givenName?: string; familyName?: string };
  photos?: { value?: string }[];
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: AppConfigService) {
    super({
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: config.googleCallbackUrl,
      scope: ['email', 'profile'],
    });
  }

  authorizationParams(): { prompt: string } {
    return { prompt: 'select_account' };
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): void {
    const { id, emails, name, photos } = profile;

    const user: GoogleOAuthUser = {
      email: emails?.[0]?.value ?? '',
      firstName: name?.givenName ?? '',
      lastName: name?.familyName ?? '',
      picture: photos?.[0]?.value ?? '',
      provider: 'google',
      providerId: id,
      emailVerified: emails?.[0]?.verified ?? false,
    };

    done(null, user);
  }
}
