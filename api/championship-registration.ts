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

type RegistrationPayload = {
  championshipId?: unknown;
  requestId?: unknown;
  playerId?: unknown;
  playerName?: unknown;
  playerEmail?: unknown;
  requestedAt?: unknown;
  accessToken?: unknown;
};

type ChampionshipRow = {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  team_count: number;
  rules: string;
  status: unknown;
  configuration?: unknown;
  created_at: string;
  updated_at: string;
};

const fallbackSupabaseUrl = "https://dbktjneeglyohycyvydt.supabase.co";
const fallbackSupabaseAnonKey = "sb_publishable_bBNv6LyEuovMXOazxQlydA_2eA7EGAc";
const SUPABASE_RPC_TIMEOUT_MS = 12_000;

function getPayloadString(payload: RegistrationPayload, key: keyof RegistrationPayload) {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message.trim() : "";
  }

  return "";
}

function getSafeErrorMessage(error: unknown) {
  const message = getErrorMessage(error);

  if (!message) {
    return "Nao foi possivel enviar o pedido de participacao.";
  }

  if (
    message.includes("Campeonato nao encontrado") ||
    message.includes("nao esta aceitando pedidos") ||
    message.includes("entrada privada") ||
    message.includes("limite maximo")
  ) {
    return message;
  }

  return "Nao foi possivel sincronizar a participacao agora. Tente novamente em instantes.";
}

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

function parseRequestBody(body: unknown): RegistrationPayload {
  if (typeof body !== "string") {
    return (body ?? {}) as RegistrationPayload;
  }

  try {
    const parsed = JSON.parse(body);
    return (parsed ?? {}) as RegistrationPayload;
  } catch {
    return {};
  }
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
  const championshipId = getPayloadString(payload, "championshipId");
  const requestId = getPayloadString(payload, "requestId");
  const playerId = getPayloadString(payload, "playerId");
  const playerName = getPayloadString(payload, "playerName") || "Jogador";
  const playerEmail = getPayloadString(payload, "playerEmail").toLowerCase();
  const requestedAt = getPayloadString(payload, "requestedAt") || new Date().toISOString();
  const accessToken = getPayloadString(payload, "accessToken");

  if (!championshipId || !requestId || !playerId || !playerEmail) {
    res.status(400).json({ error: "Dados incompletos para enviar o pedido." });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim() || fallbackSupabaseUrl;
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY?.trim() || fallbackSupabaseAnonKey;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, SUPABASE_RPC_TIMEOUT_MS);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/submit_championship_registration`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_championship_id: championshipId,
        p_request_id: requestId,
        p_player_id: playerId,
        p_player_name: playerName,
        p_player_email: playerEmail,
        p_requested_at: requestedAt,
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload && typeof payload === "object" && typeof payload.message === "string"
          ? payload.message
          : `Supabase retornou HTTP ${response.status}.`,
      );
    }

    const championship = Array.isArray(payload) ? payload[0] : payload;

    if (!championship) {
      res.status(500).json({ error: "O Supabase nao retornou a participacao salva." });
      return;
    }

    res.status(200).json({ championship: championship as ChampionshipRow });
  } catch (error) {
    console.error("[api/championship-registration] failed", error);
    res.status(500).json({ error: getSafeErrorMessage(error) });
  } finally {
    clearTimeout(timeoutId);
  }
}
