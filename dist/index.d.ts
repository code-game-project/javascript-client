interface CustomEventListenerOptions {
    once: boolean;
}
export declare class CodeGameSocket {
    private verbose;
    private socket;
    private eventListeners;
    private readonly WebSocket;
    private readonly consola;
    private readonly success;
    private readonly warn;
    private readonly info;
    private readonly error;
    /**
     * Creates a new `CodeGameSocket`
     * @param options Options required to connect and authenticate with the WebSocket server
     */
    constructor(options: {
        verbose: boolean;
        username: string;
        token: string;
        wsURL: string;
    });
    /**
     * Emits an event
     * @param event The name of the event to be emitted
     * @param options Optional options to go along with your event
     */
    emit(event: string, options?: {
        [id: string]: any;
    }): void;
    /**
     * Registers an event listener for a certain game event
     * @param event Name of the event to listen for
     * @param callback Function that is executed when event is received
     * @param options Optional options concerning the callback
     */
    on(event: string, callback: Function, options?: CustomEventListenerOptions): void;
    /**
     * Handles triggering all callbacks registered for a given event
     * @param eventName Name of the event to trigger all callbacks for
     * @param event The original game event coming from the server untouched
     * @returns `true` if event listeners where triggered, `false` if there where none to trigger
     */
    private triggerEventListeners;
}
export {};
