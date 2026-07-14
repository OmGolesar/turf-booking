import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthContext } from './auth-context';

export const Auth = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthContext | null =>
    (ctx.switchToHttp().getRequest<{ auth?: AuthContext | null }>().auth ?? null),
);
