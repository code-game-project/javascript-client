"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGameSocket = void 0;
const CONFIG_PATH = '.cg.config.json';
const IS_NODE = ((typeof process !== 'undefined' && typeof process.stdin !== 'undefined') &&
    (typeof Window === 'undefined' || typeof window === 'undefined' || typeof window.document === 'undefined'));
class CodeGameSocket {
    /**
     * Creates a new `CodeGameSocket`
     * @param options Options required to connect and authenticate with the WebSocket server
     */
    constructor(options) {
        /** event listeners for socket events */
        this.eventListeners = {};
        /** `WebSocket` API based on environment */
        this.WebSocket = IS_NODE ? require('ws') : window.WebSocket;
        /** `consola` module if `IS_NODE` is `true` */
        this.consola = IS_NODE ? require('consola') : undefined;
        /** Displays a success message */
        this.success = IS_NODE
            ? (msg) => this.consola.success({ message: msg, badge: true })
            : (msg) => console.log(`%c${msg}`, 'color: #57c12a');
        /** Displays a warning message */
        this.warn = IS_NODE
            ? (msg) => this.consola.warn({ message: msg, badge: true })
            : console.warn;
        /** Displays an informational message */
        this.info = IS_NODE
            ? (msg) => this.consola.info({ message: msg, badge: true })
            : console.info;
        /** Displays an error message */
        this.error = IS_NODE
            ? (error) => this.consola.error({
                message: (typeof error === 'object' && JSON.stringify(error, null, 2)) || (error === null || error === void 0 ? void 0 : error.toString()),
                badge: true
            })
            : console.error;
        /** Blocking prompt based on environment */
        this.prompt = IS_NODE ? require('prompt-sync')({ sigint: true }) : window.prompt;
        /** Blocking reader based on environment */
        this.reader = IS_NODE ? require('fs').readFileSync : window.localStorage.getItem;
        /** Blocking writer based on environment */
        this.writer = IS_NODE ? require('fs').writeFileSync : window.localStorage.setItem;
        /** Reads data from persistent location
         * @param name name of file or localStorage key
         */
        this.readPersistent = (name) => this.reader(name, { encoding: "utf-8" });
        /** Writes data to persistent location
         * @param name name of file or localStorage key
         * @param contents contents to write
         */
        this.writePersistent = (name, contents) => this.writer(name, contents);
        this.verbose = options.verbose || false;
        if (this.verbose)
            this.info(`Environment: ${IS_NODE ? `Node.js: ${JSON.stringify(process.versions)}` : ((navigator === null || navigator === void 0 ? void 0 : navigator.userAgent) || 'Browser')}`);
        // listeners for events in `StandardGameEvents`
        this.on('error', (data) => this.error(data.event.reason));
        this.on('join_game', (data) => this.info(`${data.event.username} joined the game`));
        // first `join_game` event confirms that the socket has been added to a game
        this.on('join_game', () => this.triggerEventListeners('ready'), { once: true });
        this.on('left_game', (data) => this.info(`${data.event.username} left the game`));
        this.on('kicked_from_game', (data) => this.warn(data.event.reason));
        // config
        const { config, newGame } = this.getConfig();
        const { username, gameId, wsURL } = config;
        // WebSocket events
        this.socket = new this.WebSocket(wsURL);
        this.socket.addEventListener('open', () => {
            this.success(`Successfully connected to ${wsURL}`);
            if (newGame) {
                this.on('created_game', (data) => this.saveConfig(Object.assign(config, { gameId: data.event.game_id })));
                this.emit('new_game', { username });
            }
            else
                this.emit('join_game', { username, game_id: gameId });
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
    }
    /**
     * Generates a username from an animal and a number between `1` and `999`
     * @returns random username
     */
    static getRandomUsername() {
        const animals = ['cat', 'dog', 'chicken', 'kangaroo', 'squirrel', 'hedgehog', 'penguin', 'fox', 'panda'];
        return animals[Math.floor(Math.random() * animals.length)] + String(Math.floor(Math.random() * 1000));
    }
    /**
     * Tries to get the config from storage; if this fails the user will need to enter new values.
     * @returns config and if a new game needs to be created or just joined
     */
    getConfig() {
        var _a;
        const config = this.loadConfig();
        if (!config ||
            config.fragmented ||
            (config.config.lastChanged + (24 * 60 * 60) < Date.now() &&
                ((_a = this.prompt(`Your config hasn't been updated since ${config.config.lastChanged}. Would you like to update it? (Y/N)`)) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'y')) {
            if (!config || config.fragmented)
                this.info(`Config ${!config ? 'does not exist' : 'is broken'}`);
            const { newConfig, newGame } = this.enterNewConfig(config === null || config === void 0 ? void 0 : config.config);
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
    enterNewConfig(fragmented_config) {
        var _a;
        const username = (fragmented_config === null || fragmented_config === void 0 ? void 0 : fragmented_config.username) || this.prompt('What would you like to be called (username): ') || (() => {
            const randomUsername = CodeGameSocket.getRandomUsername();
            this.warn(`No username specified. Using random username: "${randomUsername}"`);
            return randomUsername;
        })();
        let newGame = false;
        let gameId = fragmented_config === null || fragmented_config === void 0 ? void 0 : fragmented_config.gameId;
        if (!gameId) {
            newGame = ((_a = this.prompt('Would you like to create a new game (C) or join an existant game (J)?')) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'c';
            gameId = (fragmented_config === null || fragmented_config === void 0 ? void 0 : fragmented_config.gameId) || newGame ? 'creating...' : String(this.prompt('Which game would you like to join? (gameId): '));
        }
        const wsURL = (fragmented_config === null || fragmented_config === void 0 ? void 0 : fragmented_config.wsURL) || this.prompt('Which WebSocket endpoint would you like to connect to? (wsURL): ');
        if (!(typeof wsURL === 'string' && (wsURL.startsWith('ws') || wsURL.startsWith('wss')))) {
            throw `Invalid WebSocket URL: "${wsURL}"`;
        }
        const newConfig = {
            lastChanged: Date.now(),
            username,
            gameId,
            wsURL
        };
        return { newConfig, newGame };
    }
    /**
     * Reads config from persistent storage
     * @returns config and if any values are missing
     */
    loadConfig() {
        try {
            const data = this.readPersistent(CONFIG_PATH);
            if (data) {
                const parsed = JSON.parse(data);
                if (typeof parsed === 'object') {
                    // just a rough validity check
                    if ('lastChanged' in parsed && 'username' in parsed && 'gameId' in parsed && 'wsURL' in parsed) {
                        return { config: parsed, fragmented: false };
                    }
                    else {
                        return { config: parsed, fragmented: true };
                    }
                }
            }
        }
        catch (err) {
            this.error(`Unable to read config: ${err}`);
        }
        return null;
    }
    /**
     * Saves a config to persistant storage
     * @param config config to save
     */
    saveConfig(config) {
        try {
            this.writePersistent(CONFIG_PATH, JSON.stringify(config));
        }
        catch (err) {
            this.error(`Unable to write config: ${err}`);
        }
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
    /**	Leaves the current game */
    leave() {
        this.emit('leave_game');
        this.info('You have left the game');
    }
}
exports.CodeGameSocket = CodeGameSocket;
;
//# sourceMappingURL=index.js.map