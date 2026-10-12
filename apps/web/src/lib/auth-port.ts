/** Ce dont l'application a besoin de Supabase Auth : la connexion, rien d'autre (règle S1). */
export class AuthError extends Error {
  constructor(
    readonly code: 'INVALID_CODE' | 'RATE_LIMITED' | 'NETWORK' | 'UNKNOWN',
  ) {
    super(code);
    this.name = 'AuthError';
  }
}

export interface AuthPort {
  hasSession(): Promise<boolean>;
  getToken(): Promise<string | null>;
  /** Appelé à chaque connexion, déconnexion ou renouvellement de session. */
  onChange(listener: () => void): () => void;
  sendCode(phoneE164: string): Promise<void>;
  verifyCode(phoneE164: string, code: string): Promise<void>;
  signOut(): Promise<void>;
}
