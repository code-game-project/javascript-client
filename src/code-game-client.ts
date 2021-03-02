import consola from 'consola';

interface CodeGameSocketOptions {
	apiToken: string;
	url: string;
	verbose: boolean;
}

export class CodeGameSocket {
	verbose: boolean;
	socket: WebSocket;
	apiToken: string;
	callbacks: { [key: string]: Function };

	constructor(options: CodeGameSocketOptions) {
		this.verbose = options.verbose;
		this.apiToken = options.apiToken;
		this.callbacks = {};
		this.socket = new WebSocket(options.url);
		this.socket.send(JSON.stringify({ token: this.apiToken }));
		this.socket.addEventListener('open', () => {
			consola.success({ message: 'Connected' });
		});
		this.socket.addEventListener('close', () => {
			consola.warn({ message: 'Connection closed' });
		});
		if (this.verbose) {
			this.socket.addEventListener('data', (data) => {
				consola.info({ message: `data: ${data}` });
			});
		}
	}

	public emit(obj: any): void {
		this.socket.send(JSON.stringify(obj));
		if (this.verbose) consola.info({ message: `emit: ${obj}` });
	}

	public on(event: string, func: Function): void {
		this.callbacks[event] = func;
	}
}
