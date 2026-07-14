import { SetMetadata } from '@nestjs/common';

export const OPTIONAL_AUTH_KEY = 'optional_auth';
export const OptionalAuth = (): MethodDecorator & ClassDecorator => SetMetadata(OPTIONAL_AUTH_KEY, true);
