import { createSocket, createDebugSocket, Verbosity, Severity } from '../dist/node.js';

// create sockets
const socket = createSocket('localhost:8080', Verbosity.INFO);
const { gameId, joinSecret } = await socket.create(true, true);
await socket.join(gameId, 'tester', joinSecret);
const debugSocket = createDebugSocket('localhost:8080', Verbosity.INFO);

// register listeners
debugSocket.on(Severity.ERROR, (message, data) => console.log(Severity.ERROR, message, data));
debugSocket.on(Severity.INFO, (message, data) => console.log(Severity.INFO, message, data));
debugSocket.on(Severity.TRACE, (message, data) => console.log(Severity.TRACE, message, data));
debugSocket.on(Severity.WARNING, (message, data) => console.log(Severity.WARNING, message, data));

// debug server
await debugSocket.debugServer();

// debug game
await debugSocket.debugGame(gameId);

// debug player
const session = socket.getSession();
if (session) {
  await debugSocket.debugPlayer(gameId, session?.player_id, session?.player_secret);
} else {
  console.error('Session is undefined!');
}

// @ts-ignore
setTimeout(() => process.exit(0), 2000);
