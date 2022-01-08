/** A wrapper for all events that adds the `to` and `from` properties */
interface EventWrapper<E> {
    from: string;
    to: string;
    event: E;
}
/** An interface representing all possibly valid events */
interface AnyEvent {
    event_name: string;
    [key: string]: any;
}
/** Standard events that can be `emit`ed to the server. */
export declare type SendableStandardEvents = JoinEvent | LeaveEvent;
export interface JoinEvent {
    event_name: 'join';
    game_id: string;
    username: string;
}
export interface LeaveEvent {
    event_name: 'leave';
    game_id: string;
    username: string;
}
/** Standard events that can trigger actions when received. */
export declare type ReceiveableStandardEvents = ErrorEvent | KickEvent | JoinEvent | LeaveEvent;
export interface ErrorEvent {
    event_name: 'error';
    reason: string;
}
export interface KickEvent {
    event_name: 'kick';
    reason: string;
}
/** Events that are triggered by the client and do not come from the server. */
export declare type ClientEvents = ReadyEvent | CloseEvent;
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
declare type Callback<R> = (data: EventWrapper<R>) => any;
export declare class CodeGameSocket<SendableEvents extends AnyEvent = AnyEvent, ReceiveableEvents extends AnyEvent = AnyEvent> {
    private verbose;
    private socket;
    private gameId;
    private username;
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
        gameId: 'new' | string;
        wsURL: string;
    });
    /**
     * Emits an event
     * @param event The name of the event to be emitted
     * @param options Optional options to go along with your event
     */
    emit<S extends SendableStandardEvents | SendableEvents>(event: S['event_name'], ...eventOptions: {} extends Omit<S, 'event_name'> ? [undefined?] : [Omit<S, 'event_name'>]): void;
    /**
     * Registers an event listener for a certain event
     * @param event Name of the event to listen for
     * @param callback Function that is executed when event is received
     * @param options Optional options concerning the callback
     */
    on<R extends ReceiveableStandardEvents | ReceiveableEvents | ClientEvents>(event: R['event_name'], callback: Callback<R>, options?: EventListenerOptions): void;
    /**
     * Handles triggering all callbacks registered for a given event
     * @param eventName Name of the event to trigger all callbacks for
     * @param eventData The original event coming from the server untouched
     * @returns `true` if event listeners where triggered, `false` if there where none to trigger
     */
    private triggerEventListeners;
    /**
     * Leaves the current game
     */
    leave(): void;
}
export {};
