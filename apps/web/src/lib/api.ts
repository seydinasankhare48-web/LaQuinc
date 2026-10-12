export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly offline = false,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Jeton d'accès Supabase de la session courante, ou null. */
  getToken: () => Promise<string | null>;
  /** Quincaillerie active mémorisée, ou null. */
  getTenantId: () => string | null;
  fetch?: typeof fetch;
}

/** Client de l'API LaQuinc : toutes les données passent par ici (jamais d'accès direct aux tables). */
export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.options.getToken();
    if (!token) throw new ApiError(401, 'MISSING_TOKEN');
    const tenantId = this.options.getTenantId();
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (tenantId) headers['X-Tenant-Id'] = tenantId;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let res: Response;
    try {
      res = await (this.options.fetch ?? fetch)(`${this.options.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', true);
    }
    if (res.ok) return (await res.json()) as T;
    let code = 'INTERNAL_ERROR';
    try {
      const data = (await res.json()) as { error?: { code?: string } };
      if (data.error?.code) code = data.error.code;
    } catch {
      /* corps non JSON : code générique */
    }
    throw new ApiError(res.status, code);
  }
}
