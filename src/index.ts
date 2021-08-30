interface CustomEventListenerOptions {
	once: boolean;
}
/** A generic game event */
interface GameEvent {
	event_name: string;
	[id: string]: any;
}
interface AuthEvent extends GameEvent {
	event_name: 'auth';
	status: boolean;
}

const IS_NODE = (
	(typeof process !== 'undefined' && typeof process.stdin !== 'undefined') &&
	(typeof Window === 'undefined' || typeof window === 'undefined' || typeof window.document === 'undefined')
);

export class CodeGameSocket {
	private verbose: boolean;
	private socket: WebSocket;
	private eventListeners: { [id: string]: Array<{ callback: Function, options?: CustomEventListenerOptions; }>; } = {};
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
		token: string;
		wsURL: string;
	}) {
		this.verbose = options.verbose || false;
		if (this.verbose) this.info(`Environment: ${IS_NODE ? `Node.js: ${JSON.stringify(process.versions)}` : (navigator?.userAgent || 'Browser')}`);

		if (typeof options.username !== 'string')
			this.error('Property `username: string` is undefined. Please specify your username.');
		if (typeof options.token !== 'string')
			this.error('Property `token: string` is undefined. Please specify your API token.');
		if (typeof options.wsURL !== 'string')
			this.error('Property `wsURL: string` is undefined. Please specify your WebSocket endpoint URL.');

		// Websocket Events
		this.socket = new this.WebSocket(options.wsURL);
		this.socket.addEventListener('open', () => {
			this.success('Connected!');
			this.emit('auth', { username: options.username, token: options.token });
		});
		this.socket.addEventListener('close', () => this.warn('WebSocket connection closed!'));
		this.socket.addEventListener('message', (data) => {
			try {
				const event: GameEvent = JSON.parse(data.data);
				if (event.event_name === 'error') {
					this.error(event.reason);
				}
				else if (this.verbose) {
					this.info(`received "${event.event_name}":`);
					console.log(event);
				}
				this.triggerEventListeners(event.event_name, event);
			} catch (err) {
				this.error(err);
			}
		});

		// Game Events
		this.on('auth', (data: AuthEvent) => {
			if (data.status) {
				this.success('Authentication successful.');
				if (!this.triggerEventListeners('ready')) {
					this.warn('Connection is ready but no event listener is listening for the `ready` event!\n' +
						'This is event is dispached to let the program know when it can start emitting data.');
				}
			} else {
				this.error('Authentication failed!');
			}
		});
		this.on('kick', () => this.warn('This instance has been kicked because another instance logged in to the same game.'));
	}

	/**
	 * Emits an event
	 * @param event The name of the event to be emitted
	 * @param options Optional options to go along with your event
	 */
	public emit(event: string, options?: { [id: string]: any; }): void {
		if (!event) {
			this.error('Property `event: string` cannot be undefined.');
			return;
		}
		if (this.verbose) {
			this.info(`emitted "${event}"${options ? ':' : ''}`);
			if (options) console.log(options);
		}
		if (options && 'event_name' in options)
			this.warn('`event_name` is a reserved property. `options.event_name` will be overwritten with the name of the event.');
		try {
			this.socket.send(
				JSON.stringify(Object.assign(options || {}, { event_name: event }))
			);
		} catch (err) {
			this.error(err);
		}
	}

	/**
	 * Registers an event listener for a certain game event
	 * @param event Name of the event to listen for
	 * @param callback Function that is executed when event is received
	 * @param options Optional options concerning the callback
	 */
	public on(event: string, callback: Function, options?: CustomEventListenerOptions): void {
		if (!this.eventListeners[event]) this.eventListeners[event] = [];
		this.eventListeners[event].push({ callback, options });
	}

	/**
	 * Handles triggering all callbacks registered for a given event
	 * @param eventName Name of the event to trigger all callbacks for
	 * @param event The original game event coming from the server untouched
	 * @returns `true` if event listeners where triggered, `false` if there where none to trigger
	 */
	private triggerEventListeners(eventName: string, event?: GameEvent): boolean {
		if (!(eventName in this.eventListeners)) return false;
		for (const listener of this.eventListeners[String(eventName)]) {
			listener.callback(event || {});
			if (listener.options?.once) delete this.eventListeners[String(eventName)];
		}
		return true;
	}
};
