/** Erreurs métier typées. Le filtre d'erreurs les traduit en codes HTTP ; le texte affiché vient de packages/i18n. */
export class DomainError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends DomainError {
  constructor(code = 'UNAUTHORIZED') {
    super(401, code);
  }
}
export class ForbiddenError extends DomainError {
  constructor(code = 'FORBIDDEN') {
    super(403, code);
  }
}
/** Ressource absente, ou appartenant à un autre tenant : on ne révèle pas son existence. */
export class NotFoundError extends DomainError {
  constructor(code = 'NOT_FOUND') {
    super(404, code);
  }
}
export class ConflictError extends DomainError {
  constructor(code: string) {
    super(409, code);
  }
}
export class BadRequestError extends DomainError {
  constructor(
    code: string,
    readonly issues?: { path: string; message: string }[],
  ) {
    super(400, code);
  }
}
