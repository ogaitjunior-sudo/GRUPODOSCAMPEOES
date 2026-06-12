import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/admin-player-password";

const { endMock, postgresMock, sqlMock } = vi.hoisted(() => {
  const end = vi.fn();
  const sql = vi.fn();

  return {
    endMock: end,
    postgresMock: vi.fn(() => Object.assign(sql, { end })),
    sqlMock: sql,
  };
});

vi.mock("postgres", () => ({
  default: postgresMock,
}));

function createResponse() {
  const result = {
    statusCode: 0,
    payload: null as unknown,
    headers: {} as Record<string, string>,
  };

  return {
    result,
    response: {
      setHeader(name: string, value: string) {
        result.headers[name] = value;
      },
      status(statusCode: number) {
        result.statusCode = statusCode;
        return {
          json(payload: unknown) {
            result.payload = payload;
          },
        };
      },
    },
  };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("admin player password api", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("DATABASE_URL", "postgresql://database.example.com/postgres");
    vi.stubEnv("VITE_ADMIN_SUPABASE_EMAIL", "admin@example.com");
    postgresMock.mockClear();
    sqlMock.mockReset();
    sqlMock.mockResolvedValue([{ id: "a26073f0-9fde-43cb-9718-3ba57664fde2" }]);
    endMock.mockReset();
    endMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects invalid password data before contacting Supabase", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result, response } = createResponse();

    await handler(
      {
        method: "POST",
        headers: { authorization: "Bearer admin-token" },
        body: {
          authUserId: "not-a-user-id",
          password: "short",
        },
      },
      response,
    );

    expect(result.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a valid Supabase session that is not the configured admin", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ email: "player@example.com" }));
    vi.stubGlobal("fetch", fetchMock);
    const { result, response } = createResponse();

    await handler(
      {
        method: "POST",
        headers: { authorization: "Bearer player-token" },
        body: {
          authUserId: "a26073f0-9fde-43cb-9718-3ba57664fde2",
          password: "secure-password",
        },
      },
      response,
    );

    expect(result.statusCode).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("updates the player password after validating the admin session", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ email: "admin@example.com" }))
      .mockResolvedValueOnce(jsonResponse({ id: "a26073f0-9fde-43cb-9718-3ba57664fde2" }));
    vi.stubGlobal("fetch", fetchMock);
    const { result, response } = createResponse();

    await handler(
      {
        method: "POST",
        headers: { authorization: "Bearer admin-token" },
        body: {
          authUserId: "a26073f0-9fde-43cb-9718-3ba57664fde2",
          password: "secure-password",
        },
      },
      response,
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://project.supabase.co/auth/v1/admin/users/a26073f0-9fde-43cb-9718-3ba57664fde2",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ password: "secure-password" }),
      }),
    );
  });

  it("uses the server database when the service role key is unavailable", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ email: "admin@example.com" }));
    vi.stubGlobal("fetch", fetchMock);
    const { result, response } = createResponse();

    await handler(
      {
        method: "POST",
        headers: { authorization: "Bearer admin-token" },
        body: {
          authUserId: "a26073f0-9fde-43cb-9718-3ba57664fde2",
          password: "secure-password",
        },
      },
      response,
    );

    expect(result.statusCode).toBe(200);
    expect(postgresMock).toHaveBeenCalledWith(
      "postgresql://database.example.com/postgres",
      expect.objectContaining({ max: 1 }),
    );
    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(endMock).toHaveBeenCalledWith({ timeout: 1 });
  });
});
