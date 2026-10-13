/** Ce dont l'application a besoin de Supabase Auth : la connexion, rien d'autre (règle S1). */
export class AuthError extends Error {
  constructor(
    readonly code: 'INVALID_CODE' | 'PHONE_TAKEN' | 'RATE_LIMITED' | 'NETWORK' | 'UNKNOWN',
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
  /** Redirige vers Google ; le retour arrive sur la page de rappel avec un `code` (PKCE). */
  signInWithGoogle(): Promise<void>;
  /** Échange le `code` de l'URL de rappel contre une session. */
  completeOAuth(callbackUrl: string): Promise<void>;
  /** Ajoute un numéro à un compte sans téléphone (ex. connecté par Google) et envoie le code SMS. */
  startPhoneVerification(phoneE164: string): Promise<void>;
  /** Valide le code puis renouvelle la session, pour que le jeton porte le numéro. */
  verifyPhone(phoneE164: string, code: string): Promise<void>;
  /** Relie Google au compte connecté (redirige vers Google). */
  linkGoogle(): Promise<void>;
}
