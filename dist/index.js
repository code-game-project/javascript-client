"use strict";
const IS_NODE = typeof window === 'undefined';
const CodeGameSocket = class CodeGameSocket {
    constructor(options) {
        this.WebSocket = IS_NODE ? require('ws') : window.WebSocket;
        this.consola = IS_NODE ? require('consola') : undefined;
        this.success = IS_NODE
            ? this.consola.success
            : (obj) => console.log(obj.message);
        this.warn = IS_NODE
            ? this.consola.warn
            : (obj) => console.warn(obj.message);
        this.info = IS_NODE
            ? this.consola.info
            : (obj) => console.log(obj.message);
        this.error = IS_NODE
            ? this.consola.info
            : (obj) => console.error(obj.message);
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
    emit(obj) {
        try {
            this.socket.send(JSON.stringify(obj));
        }
        catch (err) {
            this.error(err);
        }
        if (this.verbose)
            this.info({ message: `emit: ${JSON.stringify(obj)}`, badge: true });
    }
    on(event, func) {
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
if (IS_NODE)
    exports.CodeGameSocket = CodeGameSocket;
//# sourceMappingURL=index.js.map