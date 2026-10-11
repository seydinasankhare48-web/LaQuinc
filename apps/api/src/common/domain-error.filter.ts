import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { BadRequestError, DomainError } from './errors';

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown error';
  const pgCode = (error as { code?: string }).code ?? (error.cause as { code?: string } | undefined)?.code;
  return `${error.name}${pgCode ? ` code=${pgCode}` : ''}`;
}

/** Filtre unique : jamais de détail interne dans la réponse. */
@Catch()
export class DomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof DomainError) {
      const body: { code: string; issues?: unknown } = { code: exception.code };
      if (exception instanceof BadRequestError && exception.issues) body.issues = exception.issues;
      res.status(exception.status).json({ error: body });
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = status === 429 ? 'TOO_MANY_REQUESTS' : status === 404 ? 'NOT_FOUND' : 'HTTP_ERROR';
      res.status(status).json({ error: { code } });
      return;
    }
    // Jamais de message ni de stack : les erreurs SQL de Drizzle embarquent les paramètres (téléphones…).
    this.logger.error(describeError(exception));
    res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
}
