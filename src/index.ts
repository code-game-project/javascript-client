/** A wrapper for all events that adds the `to` and `from` properties */
interface EventWrapper<E> {
	target: Target,
	origin: Origin,
	event: E;
}

/** Who the event was intended for */
interface Target {
	type: "game" | "socket" | "self",
	id: string;
}

/** A type that represents the origin of an event */
type Origin = string | "server";

/** An interface representing all possibly valid events */
interface AnyEvent {
	name: string,
	data: any;
}

/** Standard events that can be `emit`ed to the server. */
export type SendableStandardEvents = CreateGameEvent | JoinGameEvent | LeaveGameEvent;
interface CreateGameEvent extends AnyEvent {
	name: 'create_game',
	data: { username: string; };
}
export interface JoinGameEvent extends AnyEvent {
	name: 'join_game',
	data: {
		game_id: string,
		client_id: Origin,
		username: string,
	};
}
export interface LeaveGameEvent extends AnyEvent {
	name: 'leave_game',
	data: never;
}

/** Standard events that can trigger actions when received. */
export type ReceiveableStandardEvents = CreatedGameEvent | JoinedGameEvent | LeftGameEvent | DisconnectedEvent | ErrorEvent;
interface CreatedGameEvent extends AnyEvent {
	name: 'created_game',
	data: { game_id: string; };
}
interface JoinedGameEvent extends AnyEvent {
	name: 'joined_game',
	data: {
		username: string,
		client_id: Origin;
	};
}
export interface LeftGameEvent extends AnyEvent {
	name: 'left_game',
	data: undefined;
}
export interface DisconnectedEvent extends AnyEvent {
	name: 'disconnected',
	data: undefined;
}
export interface ErrorEvent extends AnyEvent {
	name: 'error',
	data: { reason: string; };
}

/** Events that are triggered by the client and do not come from the server. */
export type ClientEvents = ReadyEvent | CloseEvent;
export interface ReadyEvent extends AnyEvent {
	name: 'ready',
	data: void;
}
export interface CloseEvent extends AnyEvent {
	name: 'close',
	data: void;
}

/**
 * Options that can be provided when registering an event listener
 * 
 * These options will be checked when the listener is triggered.
 */
interface EventListenerOptions {
	/** Only triggers the event listener the first time the event occurs, then destroys the listener */
	once?: boolean;
}

/** Signature of a callback function that allows it to have a generically typed input `data` and return `any`thing even a `Promise`, thus enabling `async` functions. */
type Callback<R> = (data: EventWrapper<R>) => any;

interface Config {
	/** Time of last modifiction in unix seconds (local machine time) */
	lastChanged: number,
	username: string,
	clientId: Origin,
	gameId: string,
	wsURL: string,
}

const CONFIG_PATH = '.cg.config.json';

const IS_NODE = (
	(typeof process !== 'undefined' && typeof process.stdin !== 'undefined') &&
	(typeof Window === 'undefined' || typeof window === 'undefined' || typeof window.document === 'undefined')
);

export class CodeGameSocket<SendableEvents extends AnyEvent = AnyEvent, ReceiveableEvents extends AnyEvent = AnyEvent> {
	/** If informational messages should be printed; this can be useful for debugging. */
	private verbose: boolean;
	/** Active `WebSocket` instance */
	private socket: WebSocket;
	/** Event listeners for socket events */
	private eventListeners: { [id: string]: Array<{ callback: Callback<any>, options?: EventListenerOptions; }>; } = {};
	/** A map of socket addresses and their corresponding usernames */
	private usernameCache: { [id: Origin]: string; } = {};
	/** `WebSocket` API based on environment */
	private readonly WebSocket = IS_NODE ? require('ws') : window.WebSocket;
	/** `consola` module if `IS_NODE` is `true` */
	private readonly consola = IS_NODE ? require('consola') : undefined;
	/** Displays a success message */
	private readonly success: (msg: string) => void = IS_NODE
		? (msg: string) => this.consola.success({ message: msg, badge: true })
		: (msg: string) => console.log(`%c${msg}`, 'color: #57c12a');
	/** Displays a warning message */
	private readonly warn: (msg: string) => void = IS_NODE
		? (msg: string) => this.consola.warn({ message: msg, badge: true })
		: console.warn;
	/** Displays an informational message */
	private readonly info: (msg: string) => void = IS_NODE
		? (msg: string) => this.consola.info({ message: msg, badge: true })
		: console.info;
	/** Displays an error message */
	private readonly error: (error: any) => void = IS_NODE
		? (error: any) => this.consola.error({
			message: (typeof error === 'object' && JSON.stringify(error, null, 2)) || error?.toString(),
			badge: true
		})
		: console.error;
	/** Blocking prompt based on environment */
	private readonly prompt: (message: string, _default?: string) => string | null = IS_NODE ? require('prompt-sync')({ sigint: true }) : window.prompt;
	/** Blocking reader based on environment */
	private readonly reader: (name: string, options: any) => string | null = IS_NODE ? require('fs').readFileSync : window.localStorage.getItem;
	/** Blocking writer based on environment */
	private readonly writer: (name: string, contents: string) => void = IS_NODE ? require('fs').writeFileSync : window.localStorage.setItem;
	/** Reads data from persistent location
	 * @param name name of file or localStorage key
	 */
	private readonly readPersistent: (name: string) => string | null = (name: string) => this.reader(name, { encoding: "utf-8" });
	/** Writes data to persistent location
	 * @param name name of file or localStorage key
	 * @param contents contents to write
	 */
	private readonly writePersistent = (name: string, contents: string) => this.writer(name, contents);

	/**
	 * Creates a new `CodeGameSocket`
	 * @param options Options required to connect and authenticate with the WebSocket server
	 */
	public constructor(options: {
		verbose: boolean;
	}) {
		this.verbose = options.verbose || false;
		if (this.verbose) this.info(`Environment: ${IS_NODE ? `Node.js: ${JSON.stringify(process.versions)}` : (navigator?.userAgent || 'Browser')}`);

		// listeners for events in `StandardGameEvents`
		this.on<JoinedGameEvent>('joined_game', (ew) => {
			this.info(`${ew.event.data.username} joined the game`);
			this.cacheUser(ew.origin, ew.event.data.username);
		});
		// first `join_game` event confirms that the socket has been added to a game
		this.on<JoinedGameEvent>('joined_game', (ew) => {
			this.saveConfig(Object.assign(config, { clientId: ew.event.data.client_id }));
			this.triggerEventListeners('ready');
		}, { once: true });
		this.on<LeftGameEvent>('left_game', (ew) => this.info(`${this.getUser(ew.origin)} left the game`));
		this.on<DisconnectedEvent>('disconnected', (ew) => {
			if (this.verbose) this.info(`${this.getUser(ew.origin)} disconnected`);
			this.uncacheUser(ew.origin);
		});
		this.on<ErrorEvent>('error', (ew) => this.error(ew.event.data.reason));

		// config
		const { config, newGame } = this.getConfig();
		const { username, clientId, gameId, wsURL } = config;

		// WebSocket events
		this.socket = new this.WebSocket(wsURL);
		this.socket.addEventListener('open', () => {
			this.success(`Successfully connected to ${wsURL}`);
			if (newGame) {
				this.on<CreatedGameEvent>('created_game', (ew) => this.saveConfig(Object.assign(config, { gameId: ew.event.data.game_id })), { once: true });
				this.emit<CreateGameEvent>('create_game', { username });
			}
			else this.emit<JoinGameEvent>('join_game', { username, client_id: clientId, game_id: gameId });
		});
		this.socket.addEventListener('close', () => {
			this.warn('WebSocket connection closed!');
			this.triggerEventListeners('close');
		});
		this.socket.addEventListener('message', (data) => {
			try {
				const wrappedEvent: EventWrapper<ReceiveableStandardEvents | ReceiveableEvents> = JSON.parse(data.data);
				if (this.verbose) {
					this.info(`received "${wrappedEvent.event.name}":`);
					console.log(event);
				}
				this.triggerEventListeners(wrappedEvent);
			} catch (err) {
				this.error(`onMessage: ${err instanceof Object ? err.toString() : err}`);
			}
		});
	}

	/**
	 * Generates a username from an animal and a number between `1` and `999`
	 * @returns random username
	 */
	private static getRandomUsername() {
		const animals = ['cat', 'dog', 'chicken', 'kangaroo', 'squirrel', 'hedgehog', 'penguin', 'fox', 'panda'];
		return animals[Math.floor(Math.random() * animals.length)] + String(Math.floor(Math.random() * 1000));
	}

	/**
	 * Tries to get the config from storage; if this fails the user will need to enter new values.
	 * @returns config and if a new game needs to be created or just joined
	 */
	private getConfig(): { config: Config, newGame: boolean; } {
		const config = this.loadConfig();
		if (!config ||
			config.fragmented ||
			(config.config.lastChanged + (24 * 60 * 60) < Date.now() &&
				this.prompt(`Your config hasn't been updated since ${config.config.lastChanged}. Would you like to update it? (Y/N)`)?.toLowerCase() === 'y')
			// TODO: use human readable format for date
		) {
			if (!config || config.fragmented)
				this.info(`Config ${!config ? 'does not exist' : 'is broken'}`);
			const { newConfig, newGame } = this.enterNewConfig(config?.config);
			this.saveConfig(newConfig);
			return { config: newConfig, newGame };
		}
		else {
			return { config: config.config, newGame: false };
		}
	}

	/**
	 * Lets the user enter config options
	 * @param fragmented_config config that may have some values missing
	 * @returns config and if a new game needs to be created or just joined
	 */
	private enterNewConfig(fragmented_config?: Config): { newConfig: Config, newGame: boolean; } {
		const username = fragmented_config?.username || this.prompt('What would you like to be called (username): ') || (() => {
			const randomUsername = CodeGameSocket.getRandomUsername();
			this.warn(`No username specified. Using random username: "${randomUsername}"`);
			return randomUsername;
		})();
		let newGame = false;
		let gameId = fragmented_config?.gameId;
		if (!gameId) {
			newGame = this.prompt('Would you like to create a new game (C) or join an existant game (J)?')?.toLowerCase() === 'c';
			gameId = fragmented_config?.gameId || newGame ? 'creating...' : String(this.prompt('Which game would you like to join? (gameId): '));
		}
		const wsURL = fragmented_config?.wsURL || this.prompt('Which WebSocket endpoint would you like to connect to? (wsURL): ');
		if (!(typeof wsURL === 'string' && (wsURL.startsWith('ws') || wsURL.startsWith('wss')))) {
			throw `Invalid WebSocket URL: "${wsURL}"`;
		}
		const newConfig: Config = {
			lastChanged: Date.now(),
			username,
			clientId: 'requested...',
			gameId,
			wsURL
		};
		return { newConfig, newGame };
	}

	/**
	 * Reads config from persistent storage
	 * @returns config and if any values are missing
	 */
	private loadConfig(): { config: Config, fragmented: boolean; } | null {
		try {
			const data = this.readPersistent(CONFIG_PATH);
			if (data) {
				const parsed = JSON.parse(data);
				if (typeof parsed === 'object') {
					// just a rough validity check
					if ('lastChanged' in parsed && 'username' in parsed && 'gameId' in parsed && 'wsURL' in parsed) {
						return { config: parsed as Config, fragmented: false };
					} else {
						return { config: parsed as Config, fragmented: true };
					}
				}
			}
		} catch (err) {
			this.error(`Unable to read config: ${err}`);
		}
		return null;
	}

	/**
	 * Saves a config to persistant storage
	 * @param config config to save
	 */
	private saveConfig(config: Config) {
		try {
			this.writePersistent(CONFIG_PATH, JSON.stringify(config));
		} catch (err) {
			this.error(`Unable to write config: ${err}`);
		}
	}

	/**
	 * Associates a socket ID with a username
	 * @param socketId a socket ID
	 * @param username the corresponding username
	 */
	private cacheUser(socketId: Origin, username: string): void {
		this.usernameCache[socketId] = username;
	}

	/**
	 * Deletes a socket ID and the associated user from the cache
	 * @param socketId a socket ID
	 */
	private uncacheUser(socketId: Origin): void {
		delete this.usernameCache[socketId];
	}

	/**
	 * Gets a username by socket ID
	 * @param socketId a socket ID
	 * @returns username
	 */
	public getUser(socketId: Origin): string {
		return this.usernameCache[socketId];
	}

	/**
	 * Emits an event
	 * @param name The name of the event to be emitted
	 * @param options Optional options to go along with your event
	 */
	public emit<S extends SendableStandardEvents | SendableEvents>(name: S['name'], ...options: S['data'] extends undefined ? [undefined?] : [S['data']]): void {
		const zerothOptions = options[0];
		if (!name) {
			this.error('Property `name: string` cannot be undefined.');
			return;
		}

		try {
			this.socket.send(JSON.stringify({ name, zerothOptions }));
			if (this.verbose) {
				this.info(`emitted "${name}"${zerothOptions ? ':' : ''}`);
				if (zerothOptions) console.log(zerothOptions);
			}
		} catch (err) {
			this.error(`Unable to emit event "${name}": ${err}`);
		}
	}

	/**
	 * Registers an event listener for a certain event
	 * @param name Name of the event to listen for
	 * @param callback Function that is executed when event is received
	 * @param options Optional options concerning the callback
	 */
	public on<R extends ReceiveableStandardEvents | ReceiveableEvents | ClientEvents>(name: R['name'], callback: Callback<R>, options?: EventListenerOptions): void {
		if (!this.eventListeners[name]) this.eventListeners[name] = [];
		this.eventListeners[name].push({ callback, options });
	}

	/**
	 * Handles triggering all callbacks registered for a given event
	 * @param input either the entire wrapped event or just the name of the event if no further information is available
	 * @returns `true` if event listeners were triggered, `false` if there were none to trigger
	 */
	private triggerEventListeners(input: (EventWrapper<ReceiveableStandardEvents | ReceiveableEvents | ClientEvents>) | string): boolean {
		const wrapped_event = typeof input === 'string' ? { from: 'unknown', to: 'unknown', event: { name: input } } : input;
		const name = wrapped_event.event.name;
		if (!(name in this.eventListeners)) return false;
		for (const listener of this.eventListeners[String(name)]) {
			const { callback, options } = listener;
			try {
				callback(wrapped_event as EventWrapper<any>);
			} catch (err) {
				this.error(`Unhandled exception in event listener for event "${name
					}" ("${callback.toString()}"): ${err instanceof Object ? err.toString() : err}`);
			}
			if (options) {
				if (options.once) delete this.eventListeners[String(name)];
			}
		}
		return true;
	}

	/**	Leaves the current game */
	public leave() {
		this.emit<LeaveGameEvent>('leave_game');
		this.info('You have left the game');
	}
};
