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

type SaveTablePayload = {
  championshipId?: unknown;
  status?: unknown;
  workspace?: unknown;
};

const fallbackSupabaseUrl = "https://dbktjneeglyohycyvydt.supabase.co";
const fallbackSupabaseAnonKey = "sb_publishable_bBNv6LyEuovMXOazxQlydA_2eA7EGAc";
const fallbackAdminPassword = "GRUPODECAMPEAO";
const API_TIMEOUT_MS = 15_000;

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

function parseRequestBody(body: unknown): SaveTablePayload {
  if (typeof body !== "string") {
    return (body ?? {}) as SaveTablePayload;
  }

  try {
    const parsed = JSON.parse(body);
    return (parsed ?? {}) as SaveTablePayload;
  } catch {
    return {};
  }
}

async function readResponsePayload(response: Response) {
  return response.json().catch(() => null);
}

function getResponseError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return fallback;
}

function isValidWorkspace(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const workspace = value as {
    teams?: unknown;
    groups?: unknown;
    groupMatches?: unknown;
    bracket?: unknown;
    scoring?: unknown;
  };

  return (
    Array.isArray(workspace.teams) &&
    Array.isArray(workspace.groups) &&
    Array.isArray(workspace.groupMatches) &&
    Boolean(workspace.bracket && typeof workspace.bracket === "object") &&
    Boolean(workspace.scoring && typeof workspace.scoring === "object")
  );
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
  const championshipId = typeof payload.championshipId === "string" ? payload.championshipId.trim() : "";
  const status = typeof payload.status === "string" ? payload.status.trim() : "STARTED";
  const workspace = payload.workspace;

  if (!championshipId || !isValidWorkspace(workspace)) {
    res.status(400).json({ error: "Dados incompletos para salvar a tabela." });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim() || fallbackSupabaseUrl;
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY?.trim() || fallbackSupabaseAnonKey;
  const adminEmail = process.env.VITE_ADMIN_SUPABASE_EMAIL?.trim();
  const adminPassword =
    process.env.ADMIN_SUPABASE_PASSWORD?.trim() ||
    process.env.VITE_ADMIN_SUPABASE_PASSWORD?.trim() ||
    fallbackAdminPassword;

  if (!adminEmail || !adminPassword) {
    res.status(500).json({ error: "Credenciais admin do Supabase nao configuradas no servidor." });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, API_TIMEOUT_MS);

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
      signal: controller.signal,
    });
    const authPayload = await readResponsePayload(authResponse);

    if (!authResponse.ok) {
      throw new Error(getResponseError(authPayload, "Falha ao autenticar admin no Supabase."));
    }

    const accessToken =
      authPayload && typeof authPayload === "object" && "access_token" in authPayload
        ? (authPayload as { access_token?: unknown }).access_token
        : null;

    if (typeof accessToken !== "string" || !accessToken) {
      throw new Error("O Supabase nao retornou a sessao admin.");
    }

    const workspaceRecord = workspace as {
      teams: unknown[];
      groups: unknown[];
      groupMatches: unknown[];
      bracket: unknown;
      scoring: unknown;
    };
    const headers = {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    const championshipResponse = await fetch(
      `${supabaseUrl}/rest/v1/championships?id=eq.${encodeURIComponent(championshipId)}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status,
          updated_at: new Date().toISOString(),
        }),
        signal: controller.signal,
      },
    );
    const championshipPayload = await readResponsePayload(championshipResponse);

    if (!championshipResponse.ok) {
      throw new Error(
        getResponseError(championshipPayload, "Falha ao atualizar o campeonato."),
      );
    }

    const workspaceResponse = await fetch(`${supabaseUrl}/rest/v1/championship_workspaces`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        championship_id: championshipId,
        teams: workspaceRecord.teams,
        groups: workspaceRecord.groups,
        group_matches: workspaceRecord.groupMatches,
        bracket: workspaceRecord.bracket,
        scoring: workspaceRecord.scoring,
        updated_at: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
    const workspacePayload = await readResponsePayload(workspaceResponse);

    if (!workspaceResponse.ok) {
      throw new Error(getResponseError(workspacePayload, "Falha ao salvar a tabela."));
    }

    const championship = Array.isArray(championshipPayload)
      ? championshipPayload[0]
      : championshipPayload;
    const savedWorkspace = Array.isArray(workspacePayload) ? workspacePayload[0] : workspacePayload;

    res.status(200).json({ championship, workspace: savedWorkspace });
  } catch (error) {
    console.error("[api/admin-championship-table] failed", error);
    res.status(500).json({
      error:
        error instanceof Error && error.message.trim()
          ? error.message
          : "Nao foi possivel salvar a tabela no Supabase.",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
