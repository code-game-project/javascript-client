/** The result of an accessor function */
export interface Res<Data> { ok: boolean, statusCode?: number, data?: Data, networkError?: boolean, error?: unknown, text?: string; };

/**
 * @route GET `/api/info`
 * @returns `Promise` of possible API responses
 */
export async function getInfo(
  fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>,
  host: string
): Promise<Res<{
  name: string,
  cg_version: string,
  display_name: string,
  description: string,
  version: string,
  repository_url: string;
}>> {
  try {
    const r = await fetch(`${host}/api/info`, { method: "GET" });
    try {
      return { ok: r.ok, statusCode: r.status, data: await r.json() };
    } catch (error) {
      return { ok: r.ok, statusCode: r.status, error };
    }
  } catch (error) {
    return { ok: false, networkError: true, error };
  }
}

/**
 * @route GET `/api/events`
 * @returns `Promise` of possible API responses
 */
export async function getEvents(fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>, host: string): Promise<Res<string>> {
  try {
    const r = await fetch(`${host}/api/events`, { method: "GET" });
    try {
      return { ok: r.ok, statusCode: r.status, data: await r.text() };
    } catch (error) {
      return { ok: r.ok, statusCode: r.status, error };
    }
  } catch (error) {
    return { ok: false, networkError: true, error };
  }
}

/**
 * @route GET `/api/games`
 * @returns `Promise` of possible API responses
 */
export async function getGames(
  fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>,
  host: string
): Promise<Res<{ private: number, public: { id: string, players: number, protected: boolean; }[]; }>> {
  try {
    const r = await fetch(`${host}/api/games`, { method: "GET" });
    try {
      return { ok: r.ok, statusCode: r.status, data: await r.json() };
    } catch (error) {
      return { ok: r.ok, statusCode: r.status, error };
    }
  } catch (error) {
    return { ok: false, networkError: true, error };
  }
}

/**
 * @route POST `/api/games`
 * @returns `Promise` of possible API responses
 */
export async function createGame(
  fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>,
  host: string,
  body: { public: boolean, protected: boolean, config?: object; }
): Promise<Res<{ game_id: string, join_secret?: string; } | undefined>> {
  try {
    const r = await fetch(
      `${host}/api/games`,
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
      }
    );
    try {
      return { ok: r.ok, statusCode: r.status, data: await r.json() };
    } catch (error) {
      return { ok: r.ok, statusCode: r.status, error };
    }
  } catch (error) {
    return { ok: false, networkError: true, error };
  }
}

/**
 * @route GET `/api/games/{game_id}`
 * @returns `Promise` of possible API responses
 */
export async function getGameMetadata(
  fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>,
  path: { game_id: string; },
  host: string
): Promise<Res<{ id: string, players: number, protected: boolean, config: {}; } | undefined>> {
  try {
    const r = await fetch(`${host}/api/games/${path.game_id}`, { method: "GET" });
    try {
      return { ok: r.ok, statusCode: r.status, data: await r.json() };
    } catch (error) {
      return { ok: r.ok, statusCode: r.status, error };
    }
  } catch (error) {
    return { ok: false, networkError: true, error };
  }
}

/**
 * @route GET `/api/games/{game_id}/players`
 * @returns `Promise` of possible API responses
 */
export async function getPlayers(
  fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>,
  path: { game_id: string; },
  host: string
): Promise<Res<{ players: {}; } | undefined>> {
  try {
    const r = await fetch(`${host}/api/games/${path.game_id}/players`, { method: "GET" });
    try {
      return { ok: r.ok, statusCode: r.status, data: await r.json() };
    } catch (error) {
      return { ok: r.ok, statusCode: r.status, error };
    }
  } catch (error) {
    return { ok: false, networkError: true, error };
  }
}

/**
 * @route POST `/api/games/{game_id}/players`
 * @returns `Promise` of possible API responses
 */
export async function createPlayer(
  fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>,
  path: { game_id: string; },
  host: string,
  body: { username: string, join_secret?: string; }
): Promise<Res<{ player_id: string, player_secret: string; } | undefined>> {
  try {
    const r = await fetch(
      `${host}/api/games/${path.game_id}/players`,
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
      }
    );
    try {
      return { ok: r.ok, statusCode: r.status, data: await r.json() };
    } catch (error) {
      return { ok: r.ok, statusCode: r.status, error };
    }
  } catch (error) {
    return { ok: false, networkError: true, error };
  }
}

/**
 * @route GET `/api/games/{game_id}/players/{player_id}`
 * @returns `Promise` of possible API responses
 */
export async function getPlayer(
  fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>,
  path: { game_id: string, player_id: string; },
  host: string
): Promise<Res<{ username: string; } | undefined>> {
  try {
    const r = await fetch(
      `${host}/api/games/${path.game_id}/players/${path.player_id}`,
      { method: "GET" }
    );
    try {
      return { ok: r.ok, statusCode: r.status, data: await r.json() };
    } catch (error) {
      return { ok: r.ok, statusCode: r.status, error };
    }
  } catch (error) {
    return { ok: false, networkError: true, error };
  }
}
