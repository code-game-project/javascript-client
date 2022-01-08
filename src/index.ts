/** A wrapper for all events that adds the `to` and `from` properties */
interface EventWrapper<E> {
	from: string,
	to: string,
	event: E;
}

/** An interface representing all possibly valid events */
interface AnyEvent {
	event_name: string;
	[key: string]: any;
}

/** Standard events that can be `emit`ed to the server. */
export type SendableStandardEvents = JoinEvent | LeaveEvent;
export interface JoinEvent {
	event_name: 'join',
	game_id: string,
	username: string,
}
export interface LeaveEvent {
	event_name: 'leave',
	game_id: string,
	username: string,
}

/** Standard events that can trigger actions when received. */
export type ReceiveableStandardEvents = ErrorEvent | KickEvent | JoinEvent | LeaveEvent;
export interface ErrorEvent {
	event_name: 'error',
	reason: string;
}
export interface KickEvent {
	event_name: 'kick',
	reason: string;
}

/** Events that are triggered by the client and do not come from the server. */
export type ClientEvents = ReadyEvent | CloseEvent;
export interface ReadyEvent {
	event_name: 'ready';
}
export interface CloseEvent {
	event_name: 'close';
}

/**
 * Options that can be provided when registering an event listener
 * 
 * These options will be checked when the listener is triggered.
 */
interface EventListenerOptions {
	once: boolean;
}

/** Signature of a callback function that allows it to have a generically typed input (`data`) and return `any`thing even a `Promise`, thus enabling `async` functions. */
type Callback<R> = (data: EventWrapper<R>) => any;

const IS_NODE = (
	(typeof process !== 'undefined' && typeof process.stdin !== 'undefined') &&
	(typeof Window === 'undefined' || typeof window === 'undefined' || typeof window.document === 'undefined')
);

export class CodeGameSocket<SendableEvents extends AnyEvent = AnyEvent, ReceiveableEvents extends AnyEvent = AnyEvent> {
	private verbose: boolean;
	private socket: WebSocket;
	private gameId: string;
	private username: string;
	private eventListeners: { [id: string]: Array<{ callback: Callback<any>, options?: EventListenerOptions; }>; } = {};
	private readonly WebSocket = IS_NODE ? require('ws') : window.WebSocket;
	private readonly consola = IS_NODE ? require('consola') : undefined;
	private readonly success: (msg: string) => void = IS_NODE
		? (msg: string) => this.consola.success({ message: msg, badge: true })
		: (msg: string) => console.log(`%c${msg}`, 'color: #57c12a');
	private readonly warn: (msg: string) => void = IS_NODE
		? (msg: string) => this.consola.warn({ message: msg, badge: true })
		: console.warn;
	private readonly info: (msg: string) => void = IS_NODE
		? (msg: string) => this.consola.info({ message: msg, badge: true })
		: console.info;
	private readonly error: (error: any) => void = IS_NODE
		? (error: any) => this.consola.error({
			message: (typeof error === 'object' && JSON.stringify(error, null, 2)) || error?.toString(),
			badge: true
		})
		: console.error;

	/**
	 * Creates a new `CodeGameSocket`
	 * @param options Options required to connect and authenticate with the WebSocket server
	 */
	public constructor(options: {
		verbose: boolean;
		username: string;
		gameId: 'new' | string;
		wsURL: string;
	}) {
		this.verbose = options.verbose || false;
		if (this.verbose) this.info(`Environment: ${IS_NODE ? `Node.js: ${JSON.stringify(process.versions)}` : (navigator?.userAgent || 'Browser')}`);

		if (!options.gameId)
			this.error('Property `game_id: String` is undefined. Please specify a game id.');
		this.gameId = options.gameId;

		if (!options.username)
			this.error('Property `username: string` is undefined. Please specify a username.');
		this.username = options.username;

		if (!options.wsURL)
			this.error('Property `wsURL: string` is undefined. Please specify a WebSocket endpoint URL.');
		else if (!(options.wsURL.startsWith('ws://') || options.wsURL.startsWith('wss://')))
			this.error('Property `wsURL: string` must start with either "ws://" (unencrypted endpoint) or "wss://" (encrypted endpoint)');

		// Websocket Events
		this.socket = new this.WebSocket(options.wsURL);
		this.socket.addEventListener('open', () => {
			this.success('Connected!');
			this.emit<JoinEvent>('join', { username: options.username, game_id: options.gameId });
		});
		this.socket.addEventListener('close', () => {
			this.warn('WebSocket connection closed!');
			this.triggerEventListeners<CloseEvent>('close');
		});
		this.socket.addEventListener('message', (data) => {
			try {
				const event: EventWrapper<ReceiveableStandardEvents | ReceiveableEvents> = JSON.parse(data.data);
				if (this.verbose) {
					this.info(`received "${event.event.event_name}":`);
					console.log(event);
				}
				// TODO: get to work without having to retype `event` as `any`
				this.triggerEventListeners<ReceiveableStandardEvents | ReceiveableEvents>(event.event.event_name as (ReceiveableStandardEvents | ReceiveableEvents)['event_name'], event as any);
			} catch (err) {
				this.error(`onMessage: ${err instanceof Object ? err.toString() : err}`);
			}
		});

		// listeners for events in `StandardGameEvents`
		this.on<ErrorEvent>('error', (data) => this.error(data.event.reason));
		this.on<JoinEvent>('join', (data) => this.info(`${data.event.username} joined the game`));
		// first `join` event confirms that the socket has been added to a game
		this.on<JoinEvent>('join', () => this.triggerEventListeners<ReadyEvent>('ready'), { once: true });
		this.on<LeaveEvent>('leave', (data) => this.info(`${data.event.username} left the game`));
		this.on<KickEvent>('kick', (data) => this.warn(data.event.reason));
	}

	/**
	 * Emits an event
	 * @param event The name of the event to be emitted
	 * @param options Optional options to go along with your event
	 */
	public emit<S extends SendableStandardEvents | SendableEvents>(event: S['event_name'], ...eventOptions: {} extends Omit<S, 'event_name'> ? [undefined?] : [Omit<S, 'event_name'>]): void {
		const options = eventOptions[0];
		if (!event) {
			this.error('Property `event: string` cannot be undefined.');
			return;
		}

		if (options && 'event_name' in options)
			this.warn('`event_name` is a reserved property. `options.event_name` will be overwritten with the name of the event.');
		try {
			this.socket.send(
				JSON.stringify(Object.assign(options || {}, { event_name: event }))
			);
			if (this.verbose) {
				this.info(`emitted "${event}"${options ? ':' : ''}`);
				if (options) console.log(options);
			}
		} catch (err) {
			this.error(`Unable to emit event "${event}": ${err}`);
		}
	}

	/**
	 * Registers an event listener for a certain event
	 * @param event Name of the event to listen for
	 * @param callback Function that is executed when event is received
	 * @param options Optional options concerning the callback
	 */
	public on<R extends ReceiveableStandardEvents | ReceiveableEvents | ClientEvents>(event: R['event_name'], callback: Callback<R>, options?: EventListenerOptions): void {
		if (!this.eventListeners[event]) this.eventListeners[event] = [];
		this.eventListeners[event].push({ callback, options });
	}

	/**
	 * Handles triggering all callbacks registered for a given event
	 * @param eventName Name of the event to trigger all callbacks for
	 * @param eventData The original event coming from the server untouched
	 * @returns `true` if event listeners where triggered, `false` if there where none to trigger
	 */
	private triggerEventListeners<R extends ReceiveableStandardEvents | ReceiveableEvents | ClientEvents>(eventName: R['event_name'], ...eventData: {} extends Omit<R, 'event_name'> ? [undefined?] : [EventWrapper<R>]): boolean {
		const data = eventData[0];
		if (!(eventName in this.eventListeners)) return false;
		for (const listener of this.eventListeners[String(eventName)]) {
			const { callback, options } = listener;
			try {
				callback(data || { from: 'unknown', to: 'unknown', event: { event_name: eventName } });
			} catch (err) {
				this.error(`Unhandled exception in event listener for event "${eventName}" ("${callback.toString()}"): ${err instanceof Object ? err.toString() : err}`);
			}
			if (options) {
				if (options.once) delete this.eventListeners[String(eventName)];
			}
		}
		return true;
	}

	/**
	 * Leaves the current game
	 */
	public leave() {
		this.emit<LeaveEvent>('leave', { game_id: this.gameId, username: this.username });
		this.info('You have left the game');
	}
};
