"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGameSocket = void 0;
const IS_NODE = ((typeof process !== 'undefined' && typeof process.stdin !== 'undefined') &&
    (typeof Window === 'undefined' || typeof window === 'undefined' || typeof window.document === 'undefined'));
class CodeGameSocket {
    /**
     * Creates a new `CodeGameSocket`
     * @param options Options required to connect and authenticate with the WebSocket server
     */
    constructor(options) {
        this.eventListeners = {};
        this.WebSocket = IS_NODE ? require('ws') : window.WebSocket;
        this.consola = IS_NODE ? require('consola') : undefined;
        this.success = IS_NODE
            ? (msg) => this.consola.success({ message: msg, badge: true })
            : (msg) => console.log(`%c${msg}`, 'color: #57c12a');
        this.warn = IS_NODE
            ? (msg) => this.consola.warn({ message: msg, badge: true })
            : console.warn;
        this.info = IS_NODE
            ? (msg) => this.consola.info({ message: msg, badge: true })
            : console.info;
        this.error = IS_NODE
            ? (error) => this.consola.error({
                message: (typeof error === 'object' && JSON.stringify(error, null, 2)) || (error === null || error === void 0 ? void 0 : error.toString()),
                badge: true
            })
            : console.error;
        this.verbose = options.verbose || false;
        if (this.verbose)
            this.info(`Environment: ${IS_NODE ? `Node.js: ${JSON.stringify(process.versions)}` : ((navigator === null || navigator === void 0 ? void 0 : navigator.userAgent) || 'Browser')}`);
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
            this.emit('join', { username: options.username, game_id: options.gameId });
        });
        this.socket.addEventListener('close', () => {
            this.warn('WebSocket connection closed!');
            this.triggerEventListeners('close');
        });
        this.socket.addEventListener('message', (data) => {
            try {
                const event = JSON.parse(data.data);
                if (this.verbose) {
                    this.info(`received "${event.event.event_name}":`);
                    console.log(event);
                }
                // TODO: get to work without having to retype `event` as `any`
                this.triggerEventListeners(event.event.event_name, event);
            }
            catch (err) {
                this.error(`onMessage: ${err instanceof Object ? err.toString() : err}`);
            }
        });
        // listeners for events in `StandardGameEvents`
        this.on('error', (data) => this.error(data.event.reason));
        this.on('join', (data) => this.info(`${data.event.username} joined the game`));
        // first `join` event confirms that the socket has been added to a game
        this.on('join', () => this.triggerEventListeners('ready'), { once: true });
        this.on('leave', (data) => this.info(`${data.event.username} left the game`));
        this.on('kick', (data) => this.warn(data.event.reason));
    }
    /**
     * Emits an event
     * @param event The name of the event to be emitted
     * @param options Optional options to go along with your event
     */
    emit(event, ...eventOptions) {
        const options = eventOptions[0];
        if (!event) {
            this.error('Property `event: string` cannot be undefined.');
            return;
        }
        if (options && 'event_name' in options)
            this.warn('`event_name` is a reserved property. `options.event_name` will be overwritten with the name of the event.');
        try {
            this.socket.send(JSON.stringify(Object.assign(options || {}, { event_name: event })));
            if (this.verbose) {
                this.info(`emitted "${event}"${options ? ':' : ''}`);
                if (options)
                    console.log(options);
            }
        }
        catch (err) {
            this.error(`Unable to emit event "${event}": ${err}`);
        }
    }
    /**
     * Registers an event listener for a certain event
     * @param event Name of the event to listen for
     * @param callback Function that is executed when event is received
     * @param options Optional options concerning the callback
     */
    on(event, callback, options) {
        if (!this.eventListeners[event])
            this.eventListeners[event] = [];
        this.eventListeners[event].push({ callback, options });
    }
    /**
     * Handles triggering all callbacks registered for a given event
     * @param eventName Name of the event to trigger all callbacks for
     * @param eventData The original event coming from the server untouched
     * @returns `true` if event listeners where triggered, `false` if there where none to trigger
     */
    triggerEventListeners(eventName, ...eventData) {
        const data = eventData[0];
        if (!(eventName in this.eventListeners))
            return false;
        for (const listener of this.eventListeners[String(eventName)]) {
            const { callback, options } = listener;
            try {
                callback(data || { from: 'unknown', to: 'unknown', event: { event_name: eventName } });
            }
            catch (err) {
                this.error(`Unhandled exception in event listener for event "${eventName}" ("${callback.toString()}"): ${err instanceof Object ? err.toString() : err}`);
            }
            if (options) {
                if (options.once)
                    delete this.eventListeners[String(eventName)];
            }
        }
        return true;
    }
    /**
     * Leaves the current game
     */
    leave() {
        this.emit('leave', { game_id: this.gameId, username: this.username });
        this.info('You have left the game');
    }
}
exports.CodeGameSocket = CodeGameSocket;
;
//# sourceMappingURL=index.js.map