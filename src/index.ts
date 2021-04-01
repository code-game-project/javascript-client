interface GenericObject {
	[id: string]: string | boolean | number;
}
interface CodeGameSocketOptions {
	token: string;
	wsURL: string;
	verbose: boolean;
}

const IS_NODE = typeof window === 'undefined';

const CodeGameSocket = class CodeGameSocket {
	private verbose: boolean;
	private socket: WebSocket;
	private apiToken: string;
	private readonly WebSocket = IS_NODE ? require('ws') : window.WebSocket;
	private readonly consola = IS_NODE ? require('consola') : undefined;
	private readonly success = IS_NODE
		? this.consola.success
		: (obj: GenericObject) => console.log(obj.message);
	private readonly warn = IS_NODE
		? this.consola.warn
		: (obj: GenericObject) => console.warn(obj.message);
	private readonly info = IS_NODE
		? this.consola.info
		: (obj: GenericObject) => console.log(obj.message);
	private readonly error = IS_NODE
		? this.consola.info
		: (obj: GenericObject) => console.error(obj.message);

	public constructor(options: CodeGameSocketOptions) {
		this.verbose = options.verbose;
		this.apiToken = options.token;
		this.socket = new this.WebSocket(options.wsURL);
		this.socket.addEventListener('open', () => {
			this.success({ message: 'Connected', badge: true });
			this.emit({ token: this.apiToken, data: '{data: "lol"}' });
		});
		this.socket.addEventListener('close', () => {
			this.warn({ message: 'Connection closed', badge: true });
		});
	}

	public emit(obj: GenericObject): void {
		try {
			this.socket.send(JSON.stringify(obj));
		} catch (err) {
			this.error(err);
		}

		if (this.verbose)
			this.info({ message: `emit: ${JSON.stringify(obj)}`, badge: true });
	}

	public on(event: string, func: EventListenerOrEventListenerObject): void {
		if (this.verbose) {
			this.socket.addEventListener(event, (data) => {
				this.info({
					message: `${event}: ${JSON.stringify(data)}`,
					badge: true,
				});
			});
		}
		this.socket.addEventListener(event, func);
	}
};

if (IS_NODE) exports = CodeGameSocket;
