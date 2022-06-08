import { v4 } from 'uuid';
import { create, getInfo } from './api.js';
import { Logger } from './logger.js';
import { DataStore } from './data-store.js';
import * as std from './standard-events.js';

/** A wrapper for all events that adds the `to` and `from` properties. */
export interface EventWrapper<E> {
	origin: string,
	event: E;
}

/** An interface representing all possibly valid events. */
export interface AnyEvent {
	name: string,
	data?: object | undefined;
}

/** Wraps a `Callback` and add the event's name and listener options. */
export interface EventListenerWrapper {
	/** The name of the event that the listener ist listening for. */
	name: string,
	/** The callback function to be executed every time the event is received. */
	callback: EventListenerCallback<any>,
	/** Whether to destroy the event listener after being triggered once. */
	once?: boolean;
}

/** Signature of a callback function that allows it to have a generically typed input `data` and return `any`thing. */
export type EventListenerCallback<E extends AnyEvent> = (data: E['data'], origin: string) => void;

/** Session data to be saved in persistant storage. */
export interface Session {
	playerId: string,
	secret: string,
	gameId: string,
}

export class Socket<Events extends AnyEvent = AnyEvent> {
	/** The correct `Logger` instance based on the environment. */
	private readonly logger: Logger;
	/** The correct `DataStore` instance based on the environment. */
	private readonly dataStore: DataStore;
	/** The correct `fetch` function based on the environment. */
	private readonly fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>;
	/** The correct `WebSocket` class based on the environment. */
	private readonly WebSocket_class: typeof WebSocket;
	/** Whether informational messages should be printed; this can be useful for debugging. */
	private readonly verbosity: 'silent' | 'error' | 'info' | 'debug';
	/** The hostname of the game server. */
	private readonly host: string;
	/** Whether SSL/TLS (for `https://` and `wss://`) is enabled on the game server. */
	private tls?: boolean;
	/** The `WebSocket` instance. */
	private socket?: WebSocket;
	/** The name of the current game. */
	private gameName?: string;
	/** The username of this player. */
	private username?: string;
	/** Event listeners for events. */
	private eventListeners: { [id: string]: EventListenerWrapper; } = {};
	/** Event names mapped to event listeners. */
	private eventListenerEvents: { [id: string]: Set<string>; } = {};
	/** A map of player IDs and their corresponding usernames. */
	private usernameCache: { [id: string]: string; } = {};

	/** Creates a new CodeGame `Socket`. */
	public constructor(
		logger: Logger,
		dataStore: DataStore,
		fetch: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>,
		webSocket: typeof WebSocket,
		host: string,
		verbose: 'silent' | 'error' | 'info' | 'debug' = 'info',
	) {
		this.logger = logger;
		this.dataStore = dataStore;
		this.fetch = fetch;
		this.WebSocket_class = webSocket;
		this.verbosity = verbose;
		this.host = host;
	}

	/**
	 * Checks if the verbosity level is high enough
	 * @param required the required verbosity level
	 * @returns `true` if the current verbosity level is equal or greater to the required verbosity level
	 */
	private verbosityReached(required: typeof this.verbosity): boolean {
		if (this.verbosity === 'silent') return false;
		else if (this.verbosity === 'error' && required === 'error') return true;
		else if (this.verbosity === 'info' && (required === 'info' || required === 'error')) return true;
		else if (this.verbosity === 'debug') return true;
		return false;
	}

	/**
	 * Registers an event listener for a certain event.
	 * @param name Name of the event to listen for.
	 * @param callback Function that is executed when event is received.
	 * @param once If the listener should self-destruct after being triggered once.
	 * @returns the listener's ID
	 */
	private listen<E extends std.Events | Events>(name: E['name'], callback: EventListenerCallback<E>, once: boolean): string {
		const id = v4();
		if (!this.eventListenerEvents[name]) this.eventListenerEvents[name] = new Set();
		this.eventListenerEvents[name].add(id);
		this.eventListeners[id] = ({ name, callback, once });
		return id;
	}

	/**
	 * Removes an event listener by ID.
	 * @param id the listner's ID
	 */
	public removeListener(id: string) {
		this.eventListenerEvents[this.eventListeners[id].name].delete(id);
		delete this.eventListeners[id];
	}

	/**
	 * Handles triggering all callbacks registered for a given event.
	 * @param we the wrapped event to be handled
	 */
	private triggerEventListeners(we: EventWrapper<std.Events | Events>) {
		const name = we.event.name;
		if (!(name in this.eventListenerEvents)) return;
		for (const id of this.eventListenerEvents[name]) {
			const { callback, once } = this.eventListeners[id];
			try {
				callback(we.event.data, we.origin);
			} catch (err) {
				if (this.verbosityReached('error')) {
					this.logger.error(`Unhandled exception in event listener for event '${name}' ('${callback.toString().slice(0, 100)}'):`);
					console.error(err);
				}
			}
			if (once) this.removeListener(id);
		}
	}

	/**
	 * Registers an event listener for a certain event.
	 * @param name Name of the event to listen for.
	 * @param callback Function that is executed when event is received.
	 * @returns the listener's ID
	 */
	public on<E extends std.Events | Events>(name: E['name'], callback: EventListenerCallback<E>): string {
		return this.listen<E>(name, callback, false);
	}

	/**
	 * Registers an event listener for a certain event that will self-destruct after being triggered once.
	 * @param name Name of the event to listen for.
	 * @param callback Function that is executed when event is received.
	 * @returns the listener's ID
	 */
	public once<E extends std.Events | Events>(name: E['name'], callback: EventListenerCallback<E>): string {
		return this.listen<E>(name, callback, true);
	}

	/**
	 * Sends an event.
	 * @param name The name of the event to be sent.
	 * @param data Optional options to go along with your event.
	 */
	public send<E extends std.Events | Events>(name: E['name'], ...data: E['data'] extends undefined ? [undefined?] : [E['data']]): void {
		const zerothData = data[0];
		try {
			if (this.socket) {
				this.socket.send(JSON.stringify({ name, data: zerothData }));
				if (this.verbosityReached('debug')) {
					this.logger.info(`sent '${name}'${zerothData ? ':' : ''}`);
					if (zerothData) console.log(zerothData);
				}
			} else if (this.verbosityReached('error')) this.logger.error('There is currently no WebSocket connection established!');
		} catch (err) {
			if (this.verbosityReached('error')) {
				this.logger.error(`Unable to send event '${name}':`);
				console.error(err);
			}
		}
	}

	/**
	 * Associates a player ID with a username.
	 * @param playerId the player ID
	 * @param username the corresponding username
	 */
	private cacheUsername(playerId: string, username: string): void {
		this.usernameCache[playerId] = username;
	}

	/**
	 * Deletes a player ID and the associated username from the cache.
	 * @param playerId the player ID
	 */
	private uncacheUsername(playerId: string): void {
		delete this.usernameCache[playerId];
	}

	/**
	 * Gets a username by player ID.
	 * @param playerId the player ID
	 * @returns the username
	 */
	public resolveUsername(playerId: string): string | null {
		return this.usernameCache[playerId] || null;
	}

	/**
	 * Returns the protocols to run the network request for.
	 * @param protocol the base protocol (for example `http` or `ws`)
	 * @returns an array of protocols
	 */
	private protocol(protocol: string): string[] {
		if (typeof this.tls === 'undefined') return [protocol + 's', protocol];
		else if (this.tls) return [protocol + 's'];
		else return [protocol];
	}

	/**
	 * Creates a new game.
	 * @param _public Wheather the game should be listed as public.
	 * @returns the game ID
	 * @throws if something goes wrong during the create process
	 */
	public async create(_public: boolean): Promise<string> {
		let networkError;
		let err = null;
		for (const protocol of this.protocol('http')) {
			const res = await create(this.fetch, protocol + '://' + this.host, { public: _public });
			if (res.data) {
				if ('game_id' in res.data) {
					if (this.verbosityReached('info')) this.logger.info(`Created game with ID '${res.data.game_id}'.`);
					if (err === null) this.tls = true;
					return res.data.game_id;
				}
				else if ('message' in res.data) throw res.data.message;
			}
			networkError = res.networkError;
			err = res.error;
			this.tls = false;
		}
		if (networkError) return ('A network error occurred while trying to connect to the server.');
		this.tls = undefined;
		throw err || 'Something went extremely wrong.';
	}

	/**
	 * Creates a new WebSocket connection to the game server.
	 * @throws if an error occurs that cannot be handled
	 */
	private async makeWebSocketConnection(): Promise<void> {
		return new Promise(async (resolve, reject) => {
			if (this.socket) resolve();
			else {
				let err: Event | null = null;
				for (const protocol of this.protocol('ws')) {
					await new Promise<void>((_continue, _) => {
						this.socket = new this.WebSocket_class(protocol + '://' + this.host + '/ws') as WebSocket;
						const connectionFailed = (ev: Event) => {
							err = ev;
							this.tls = false;
							_continue();
						};
						this.socket.addEventListener('error', connectionFailed, { once: true });
						this.socket.addEventListener('open', () => {
							if (err === null) this.tls = true;
							if (this.verbosityReached('info')) this.logger.success(`WebSocket to ${this.host} opened.`);
							this.socket?.removeEventListener('error', connectionFailed);
							this.socket?.addEventListener('close', () => this.verbosityReached('error') && this.logger.error('WebSocket closed!'));
							this.socket?.addEventListener('message', (data) => {
								try {
									const wrappedEvent: EventWrapper<std.Events | Events> = JSON.parse(data.data);
									if (this.verbosityReached('debug')) {
										this.logger.info(`received '${wrappedEvent.event.name}':`);
										console.log(wrappedEvent);
									}
									this.triggerEventListeners(wrappedEvent);
								} catch (error) {
									if (this.verbosityReached('error')) {
										this.logger.error(`Error in WebSocket 'message' event listener:`);
										console.error(error);
									};
								}
							});
							this.socket?.addEventListener('error', (ev) => {
								if (this.verbosityReached('error')) {
									this.logger.error(`WebSocket 'error' event:`);
									console.error(ev);
								}
							});
							this.autoHandleStandardEvents();
							resolve();
						});
					});
				}
				if (err) {
					this.tls = undefined;
					reject(err);
				}
			}
		});
	}

	/** Registers event listeners for standard events that need to be handled by the library. */
	private autoHandleStandardEvents() {
		this.on<std.CgNewPlayer>('cg_new_player', (data, origin) => {
			if (this.verbosityReached('info')) this.logger.info(`${data.username} joined the game.`);
			this.cacheUsername(origin, data.username);
		});
		this.on<std.CgInfo>('cg_info', (data) => {
			for (const [playerId, username] of Object.entries(data.players)) {
				this.cacheUsername(playerId, username);
			}
		});
		this.on<std.CgLeft>('cg_left', (_, origin) => {
			if (this.verbosityReached('info')) this.logger.info(`${this.resolveUsername(origin)} left the game.`);
			this.uncacheUsername(origin);
		});
		this.on<std.CgError>('cg_error', (data) => this.verbosityReached('error') && this.logger.error(data.message));
	}

	/** Gets the name of the game from the server's info endpoint */
	private async getGameName(): Promise<string> {
		if (this.gameName) return this.gameName;
		let err = null;
		for (const protocol of this.protocol('http')) {
			const res = await getInfo(this.fetch, protocol + '://' + this.host);
			if (res.data && 'name' in res.data) {
				if (err === null) this.tls = true;
				return (this.gameName = res.data.name);
			};
			this.tls = false;
			err = res.error;
		}
		this.tls = undefined;
		if (this.verbosityReached('error')) {
			err && this.logger.error(err);
			this.logger.warn('Unable to get the game\'s name. Using \'unknown\' for now.');
		}
		return (this.gameName = 'unknown');
	}

	/**
	 * Joins an existing game.
	 * @param gameId The ID of the game to join.
	 * @param username The username to join with.
	 * @throws if something goes wrong during the join process
	 */
	public async join(gameId: string, username: string): Promise<void> {
		this.username = username;
		return new Promise(async (resolve, reject) => {
			try {
				await this.makeWebSocketConnection();
				const joinedListener = this.once<std.CgJoined>('cg_joined', async (data, origin) => {
					this.dataStore.writeJSON([this.dataStore.GAMES_PATH, await this.getGameName(), username], {
						playerId: origin,
						gameId,
						secret: data.secret
					});
					this.removeListener(errorListener);
					resolve();
				});
				const errorListener = this.once<std.CgError>('cg_error', (data) => {
					this.removeListener(joinedListener);
					reject(data.message);
				});
				this.send<std.CgJoin>('cg_join', { game_id: gameId, username });
			} catch (err) {
				reject(err || 'Something went extremely wrong.');
			}
		});
	}

	/**
	 * Tries to restore the session.
	 * @param username The username that was used when the session was created.
	 * @throws if the session cannot be restored
	 */
	public async restoreSession(username: string): Promise<void> {
		this.username = username;
		return new Promise(async (resolve, reject) => {
			try {
				const { gameId, playerId, secret } = this.dataStore.readJSON([this.dataStore.GAMES_PATH, await this.getGameName(), username]) as Session;
				await this.makeWebSocketConnection();
				const connectedListener = this.once<std.CgConnected>('cg_connected', () => {
					this.removeListener(errorListener);
					resolve();
				});
				const errorListener = this.once<std.CgError>('cg_error', (data) => {
					this.removeListener(connectedListener);
					reject(data.message);
				});
				this.send<std.CgConnect>('cg_connect', { game_id: gameId, player_id: playerId, secret });
			} catch (err) {
				reject(err || 'Something went extremely wrong.');
			}
		});
	}

	/**
	 * Connects to a game and player using session credentials.
	 * @param gameId The ID of the game to connect to.
	 * @param playerId The ID of the player to connect to.
	 * @param secret The secret of the player.
	 * @throws if something goes wrong during the connect process
	 */
	public async connect(gameId: string, playerId: string, secret: string): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				await this.makeWebSocketConnection();
				const connectedListener = this.once<std.CgConnected>('cg_connected', async (data) => {
					this.username = data.username;
					this.dataStore.writeJSON([this.dataStore.GAMES_PATH, await this.getGameName(), this.username], {
						playerId,
						gameId,
						secret
					});
					this.removeListener(errorListener);
					resolve();
				});
				const errorListener = this.once<std.CgError>('cg_error', (data) => {
					this.removeListener(connectedListener);
					reject(data.message);
				});
				this.send<std.CgConnect>('cg_connect', { game_id: gameId, player_id: playerId, secret });
			} catch (err) {
				reject(err || 'Something went extremely wrong.');
			}
		});
	}

	/**
	 * Join a game as a spectator.
	 * @param gameId The ID of the game to spectate.
	 * @throws if the connection cannot be established
	 */
	public async spectate(gameId: string): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				await this.makeWebSocketConnection();
				this.send<std.CgSpectate>('cg_spectate', { game_id: gameId });
				resolve();
			} catch (err) {
				reject(err);
			}
		});
	}

	/**	Leaves the current game. */
	public leave() {
		this.send<std.CgLeave>('cg_leave');
		if (this.gameName && this.username) this.dataStore._delete([this.dataStore.GAMES_PATH, this.gameName, this.username]);
	}
};
