"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGameSocket = void 0;
const consola_1 = require("consola");
class CodeGameSocket {
    constructor(options) {
        this.verbose = options.verbose;
        this.apiToken = options.apiToken;
        this.callbacks = {};
        this.socket = new WebSocket(options.url);
        this.socket.send(JSON.stringify({ token: this.apiToken }));
        this.socket.addEventListener('open', () => {
            consola_1.default.success({ message: 'Connected' });
        });
        this.socket.addEventListener('close', () => {
            consola_1.default.warn({ message: 'Connection closed' });
        });
        if (this.verbose) {
            this.socket.addEventListener('data', (data) => {
                consola_1.default.info({ message: `data: ${data}` });
            });
        }
    }
    emit(obj) {
        this.socket.send(JSON.stringify(obj));
        if (this.verbose)
            consola_1.default.info({ message: `emit: ${obj}` });
    }
    on(event, func) {
        this.callbacks[event] = func;
    }
}
exports.CodeGameSocket = CodeGameSocket;
//# sourceMappingURL=code-game-client.js.map