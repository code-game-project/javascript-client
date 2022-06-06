/** The result of an accessor function */
export interface Res<Data> { ok: boolean, data?: Data, networkError?: boolean, error?: unknown; };

export interface Error { message: string; };

/**
 * @route GET `/info`
 * @returns `Promise` of possible API responses
 */
export async function getInfo(fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>, host: string): Promise<Res<{ name: string, cg_version: string, display_name: string, description: string, version: string, repository_url: string; }>> {
	try {
		const r = await fetch(`${host}/info`, { method: 'GET' });
		try {
			return { ok: r.ok, data: await r.json() };
		} catch (error) {
			return { ok: r.ok, error };
		}
	} catch (error) {
		return { ok: false, networkError: true, error };
	}
}

/**
 * @route POST `/games`
 * @returns `Promise` of possible API responses
 */
export async function create(fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>, host: string, body: { public: boolean; }): Promise<Res<{ game_id: string; } | Error>> {
	try {
		const r = await fetch(
			`${host}/games`,
			{
				method: 'POST',
				body: JSON.stringify(body),
				headers: { 'Content-Type': 'application/json' }
			}
		);
		try {
			return { ok: r.ok, data: await r.json() };
		} catch (error) {
			return { ok: r.ok, error };
		}
	} catch (error) {
		return { ok: false, networkError: true, error };
	}
}
