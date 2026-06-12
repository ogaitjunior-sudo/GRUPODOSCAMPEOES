type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => {
    json: (payload: unknown) => void;
  };
};

type PasswordPayload = {
  authUserId?: unknown;
  password?: unknown;
};

const fallbackSupabaseUrl = "https://dbktjneeglyohycyvydt.supabase.co";
const fallbackSupabaseAnonKey = "sb_publishable_bBNv6LyEuovMXOazxQlydA_2eA7EGAc";
const API_TIMEOUT_MS = 12_000;
const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getHeaderValue(req: ApiRequest, key: string) {
  const value = req.headers?.[key] ?? req.headers?.[key.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function isSameOriginRequest(req: ApiRequest) {
  const origin = getHeaderValue(req, "origin");
  const host = getHeaderValue(req, "host");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function parseRequestBody(body: unknown): PasswordPayload {
  if (typeof body !== "string") {
    return (body ?? {}) as PasswordPayload;
  }

  try {
    return (JSON.parse(body) ?? {}) as PasswordPayload;
  } catch {
    return {};
  }
}

function getBearerToken(req: ApiRequest) {
  const authorization = getHeaderValue(req, "authorization");

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
}

async function readResponsePayload(response: Response) {
  return response.json().catch(() => null);
}

function getResponseError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const record = payload as { message?: unknown; msg?: unknown; error_description?: unknown };
    const message = record.message ?? record.msg ?? record.error_description;

    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return fallback;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  if (!isSameOriginRequest(req)) {
    res.status(403).json({ error: "Origem nao permitida." });
    return;
  }

  const payload = parseRequestBody(req.body);
  const authUserId = typeof payload.authUserId === "string" ? payload.authUserId.trim() : "";
  const password = typeof payload.password === "string" ? payload.password.trim() : "";
  const accessToken = getBearerToken(req);

  if (!USER_ID_PATTERN.test(authUserId) || password.length < 8) {
    res.status(400).json({ error: "Informe um jogador valido e uma senha com pelo menos 8 caracteres." });
    return;
  }

  if (!accessToken) {
    res.status(401).json({ error: "Sessao administrativa ausente." });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim() || fallbackSupabaseUrl;
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY?.trim() || fallbackSupabaseAnonKey;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();
  const adminEmail = process.env.VITE_ADMIN_SUPABASE_EMAIL?.trim().toLowerCase();

  if (!serviceRoleKey || !adminEmail) {
    res.status(500).json({
      error: "A alteracao direta de senha ainda nao foi configurada no servidor.",
    });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const adminResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });
    const adminPayload = await readResponsePayload(adminResponse);
    const authenticatedEmail =
      adminPayload && typeof adminPayload === "object" && "email" in adminPayload
        ? (adminPayload as { email?: unknown }).email
        : null;

    if (
      !adminResponse.ok ||
      typeof authenticatedEmail !== "string" ||
      authenticatedEmail.trim().toLowerCase() !== adminEmail
    ) {
      res.status(403).json({ error: "Esta sessao nao possui permissao para alterar senhas." });
      return;
    }

    const updateResponse = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(authUserId)}`,
      {
        method: "PUT",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
        signal: controller.signal,
      },
    );
    const updatePayload = await readResponsePayload(updateResponse);

    if (!updateResponse.ok) {
      throw new Error(getResponseError(updatePayload, "O Supabase recusou a alteracao de senha."));
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[api/admin-player-password] failed", error);
    res.status(500).json({
      error:
        error instanceof Error && error.name === "AbortError"
          ? "A alteracao de senha demorou mais que o esperado."
          : error instanceof Error && error.message.trim()
            ? error.message
            : "Nao foi possivel alterar a senha agora.",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
