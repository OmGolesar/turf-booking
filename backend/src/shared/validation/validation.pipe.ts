import { ArgumentMetadata, Injectable, ValidationPipe as NestValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { DomainException } from '../errors/domain.exception';
import type { FieldError } from '../response/envelope';

@Injectable()
export class ValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]): DomainException =>
        new DomainException('VALIDATION_FAILED', { fieldErrors: flatten(errors) }),
    });
  }

  override async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    return super.transform(value, metadata);
  }
}

function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  const out: FieldError[] = [];
  for (const err of errors) {
    const path = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) {
      for (const [rule, message] of Object.entries(err.constraints)) {
        out.push({ field: path, code: rule.toUpperCase(), message });
      }
    }
    if (err.children?.length) out.push(...flatten(err.children, path));
  }
  return out;
}
