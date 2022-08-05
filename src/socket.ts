import { getInfo, getPlayer } from './api.js';
import { Logger } from './logger.js';
import { DataStore } from './data-store.js';
import { trimURL } from './utils.js';

const CLIENT_CG_VERSION = [0, 7];

/** Wraps a `Callback` and add the event's name and listener options. */
interface EventListenerWrapper {
	/** The name of the event that the listener ist listening for. */
	name: string,
	/** The callback function to be executed every time the event is received. */
	callback: Function,
	/** Whether to destroy the event listener after being triggered once. */
	once?: boolean;
}

/** Logging levels for the Socket. */
export enum Verbosity {
	/** Don't log __anything__. Even exceptions in the library will be suppressed. */
	SILENT = 'silent',
	/** Only log errors. */
	ERROR = 'error',
	/** Only log errors and warnings. */
	WARNING = 'warning',
	/** Log all important game events as well as errors and warnings. */
	INFO = 'info',
	/** Log everything. */
	DEBUG = 'debug'
}

/**
 * An extensible class that implements logging, storage,
 * username resolution and an easy way to obtain and
 * maintain a websocket connection.
 */
export class Socket {
	/** The correct `Logger` instance based on the environment. */
	protected readonly logger: Logger;
	/** The correct `DataStore` instance based on the environment. */
	protected readonly dataStore: DataStore;
	/** The correct `fetch` function based on the environment. */
	protected readonly fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>;
	/** The correct `WebSocket` class based on the environment. */
	protected readonly WebSocket_class: typeof WebSocket;
	/** The level of verbosity when logging. */
	public verbosity: Verbosity;
	/** The host (and base path) of the game server. */
	protected readonly host: string;
	/** Whether SSL/TLS (for `https://` and `wss://`) is enabled on the game server. */
	private tls?: boolean;
	/** The `WebSocket` instance. */
	protected socket?: WebSocket;
	/** Event listeners for events. */
	private listeners: { [id: symbol]: EventListenerWrapper; } = {};
	/** Event names mapped to event listeners. */
	private listenerGroups: { [id: string]: Set<symbol>; } = {};
	/** The game ID, seperate from the session in case there is none. */
	protected gameId?: string;
	/** A map of player IDs and their corresponding usernames. */
	private usernameCache: { [id: string]: string; } = {};

	/**
	 * Creates a new CodeGame `Socket`.
	 * @param logger An implementation of `Logger` that works in your environment.
	 * @param dataStore An implementation of `Logger` that works in your environment.
	 * @param fetch An implementation of `fetch` that works in your environment.
	 * @param webSocket An implementation of `WebSocket` that works in your environment.
	 * @param host The URL of the game server.
	 * @param verbosity The level of verbosity when logging.
	 */
	public constructor(
		logger: Logger,
		dataStore: DataStore,
		fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>,
		webSocket: typeof WebSocket,
		host: string,
		verbosity: Verbosity = Verbosity.INFO,
	) {
		this.logger = logger;
		this.dataStore = dataStore;
		this.fetch = fetch;
		this.WebSocket_class = webSocket;
		this.verbosity = verbosity;
		this.host = trimURL(host);
		this.checkVersionCompatible();
	}

	/**
	 * Checks if the CodeGame version of the server is compatible
	 * with the CodeGame version of the Client.
	 */
	private async checkVersionCompatible() {
		const res = await getInfo(this.fetch, await this.protocol('http') + this.host);
		if (!res.data?.name || !res.data.cg_version) {
			this.logger.error('The URL specified does not seem to belong to a CodeGame server.');
			return;
		}
		const serverVersionSplit = res.data.cg_version.split('.', 2);
		const serverMajor = Number(serverVersionSplit[0]);
		const serverMinor = Number(serverVersionSplit[1] || 0);
		if (
			serverMajor !== CLIENT_CG_VERSION[0] ||
			serverMinor < CLIENT_CG_VERSION[1] ||
			serverMajor === 0 && serverMinor !== CLIENT_CG_VERSION[1]
		) this.logger.warn(`CodeGame version mismatch. Server: v${res.data.cg_version}, client: v${CLIENT_CG_VERSION.join('.')}`);
	}

	/**
	 * Checks if the verbosity level is high enough
	 * @param required The required verbosity level.
	 * @returns `true` if the current verbosity level is equal or greater to the required verbosity level
	 */
	protected verbosityReached(required: Verbosity): boolean {
		if (this.verbosity === Verbosity.SILENT) return false;
		else if (this.verbosity === Verbosity.ERROR && required === Verbosity.ERROR) return true;
		else if (this.verbosity === Verbosity.INFO && (required === Verbosity.INFO || required === Verbosity.ERROR)) return true;
		else if (this.verbosity === Verbosity.DEBUG) return true;
		return false;
	}

	/** Checks if SSL/TLS is available for the game server. */
	private async tlsAvailable(): Promise<boolean> {
		if (typeof this.tls !== 'undefined') return this.tls;
		try {
			await this.fetch('https://' + this.host + '/api/info');
			return this.tls = true;
		} catch (err) {
			try {
				await this.fetch('http://' + this.host + '/api/info');
				if (this.verbosityReached(Verbosity.WARNING)) {
					this.logger.warn('Server does not support TLS.');
				}
				return this.tls = false;
			} catch (err) {
				if (this.verbosityReached(Verbosity.ERROR)) {
					this.logger.error('Unable to connect to the server using "http" or "https".');
				}
				throw err;
			}
		}
	};

	/**
	 * Returns the correct protocol based on `this.tls`.
	 * @param protocol The base protocol (for example `http` or `ws`).
	 * @returns the protocol followed by `://`
	 */
	protected async protocol(protocol: string): Promise<string> {
		if (await this.tlsAvailable()) return protocol + 's://';
		else return protocol + '://';
	};

	/**
	 * Gets the username of a player in the current game from the server.
	 * @param playerId The player ID.
	 * @returns the username or null if the username is unavailable
	 */
	protected async fetchUsername(playerId: string): Promise<string | null> {
		if (this.gameId) {
			const res = await getPlayer(
				this.fetch,
				{ game_id: this.gameId, player_id: playerId },
				await this.protocol('http') + this.host
			);
			if (res.data && 'username' in res.data) return this.usernameCache[playerId] = res.data.username;
			if (res.statusCode === 404 && this.verbosityReached(Verbosity.WARNING)) this.logger.warn(`Unable to find username for player "${playerId}".`);
			if (res.networkError && this.verbosityReached(Verbosity.ERROR)) this.logger.error('A network error occurred while trying to connect to the server.');
		} else if (this.verbosityReached(Verbosity.ERROR)) {
			this.logger.error('Cannot resolve usernames before connecting to a game.');
		}
		return null;
	}

	/**
	 * Gets a username by player ID.
	 * @param playerId The player ID.
	 * @returns the username or null if the username is unavailable
	 */
	public async getUsername(playerId: string): Promise<string | null> {
		return this.usernameCache[playerId] || await this.fetchUsername(playerId);
	};

	/**
	 * Creates a new WebSocket connection to the game server.
	 * @param endpoint The path to a WebSocket endpoint.
	 * @param messageHandler A function to handle the 'message' event.
	 * @throws if an error occurs that cannot be handled
	 */
	protected async makeWebSocketConnection(endpoint: string, messageHandler: (data: MessageEvent<any>) => void): Promise<void> {
		return new Promise(async (resolve, reject) => {
			if (this.socket) resolve();
			else {
				this.socket = new this.WebSocket_class(await this.protocol('ws') + this.host + endpoint) as WebSocket;
				this.socket.addEventListener('error', (ev) => reject(ev), { once: true });
				this.socket.addEventListener('open', () => {
					if (this.verbosityReached(Verbosity.INFO)) this.logger.success(`WebSocket to ${this.host} opened.`);
					this.socket?.addEventListener('error', (ev) => {
						if (this.verbosityReached(Verbosity.ERROR)) {
							this.logger.error('WebSocket "error" event:', ev);
						}
					});
					this.socket?.addEventListener('close', () => {
						if (this.verbosityReached(Verbosity.ERROR)) {
							this.logger.error('WebSocket closed!');
						}
					});
					this.socket?.addEventListener('message', messageHandler);
					resolve();
				});
			}
		});
	};

	/**
	 * Registers an event listener for a certain event.
	 * @param name Name of the event to listen for.
	 * @param callback Function that is executed when event is received.
	 * @param once Whether the listener should self-destruct after being triggered once.
	 * @returns the listener's ID
	 */
	protected listen(name: string, callback: Function, once: boolean): symbol {
		const id = Symbol();
		if (!this.listenerGroups[name]) this.listenerGroups[name] = new Set();
		this.listenerGroups[name].add(id);
		this.listeners[id] = ({ name, callback, once });
		return id;
	}

	/**
	 * Removes an event listener by ID.
	 * @param id The listner's ID.
	 */
	public removeListener(id: symbol): void {
		this.listenerGroups[this.listeners[id].name].delete(id);
		delete this.listeners[id];
	};

	/**
	 * Handles triggering all callbacks registered for a given event.
	 * @param eventName The name of the event to be handled.
	 * @param data The data to be passed to the listeners.
	 */
	protected triggerListeners(eventName: string, ...data: any[]): void {
		if (!(eventName in this.listenerGroups)) return;
		for (const id of this.listenerGroups[eventName]) {
			const { callback, once } = this.listeners[id];
			try {
				callback(...data);
			} catch (err) {
				if (this.verbosityReached(Verbosity.ERROR)) {
					this.logger.error(`Unhandled exception in listener for event "${eventName}" ('${callback.toString().slice(0, 100)}'):`, err);
				}
			}
			if (once) this.removeListener(id);
		}
	}
}
