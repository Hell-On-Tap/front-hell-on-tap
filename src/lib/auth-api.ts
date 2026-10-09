/**
 * Chamadas de autenticação para a api-hell-on-tap (NestJS).
 * Endpoints: POST /auth/login, POST /auth/register, GET /auth/me (Bearer).
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type LoginInput = { login: string; password: string; remember: boolean };
export type RegisterInput = { nickname: string; email: string; password: string };
export type AuthResponse = {
  accessToken: string;
  user: { id: string; nickname: string; email: string };
};

/** Erro com mensagem pronta para mostrar na tela. */
export class AuthError extends Error {
  constructor(
    message: string,
    /** status HTTP; 0 = não chegou a falar com a API */
    readonly status = 0,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  if (!API_URL) {
    console.warn("NEXT_PUBLIC_API_URL não definida: configure o endereço da API no .env.local");
    throw new AuthError("Login indisponível no momento: o servidor ainda não está conectado.");
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { credentials: "include", ...init });
  } catch {
    throw new AuthError("Não foi possível falar com o servidor. Tente de novo em instantes.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // formato padrão de erro do NestJS: { message: string | string[] }
    const message = Array.isArray(data?.message) ? data.message.join(" ") : data?.message;
    throw new AuthError(message || "Algo deu errado. Tente de novo.", res.status);
  }
  return data as T;
}

function post<T>(path: string, body: unknown) {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function login(input: LoginInput) {
  return post<AuthResponse>("/auth/login", input);
}

export function register(input: RegisterInput) {
  return post<AuthResponse>("/auth/register", input);
}

/** Confere o token salvo e devolve o usuário dono dele. */
export function me(token: string) {
  return request<AuthResponse["user"]>("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}
