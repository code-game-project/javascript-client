import { createSocket, Verbosity, type Session } from "../dist/node.js";

// create and join
const socket = createSocket("localhost:8080", Verbosity.INFO);
const { gameId, joinSecret } = await socket.create(true, true);
await socket.join(gameId, "test", joinSecret);

// available data
console.log(await socket.fetchGameMetadata());
console.log(socket.getSession());

// reconnect and disconnect
const { player_id, player_secret } = socket.getSession() as Session;
await socket.connect(gameId, player_id, player_secret);
socket.disconnect();

setTimeout(() => process.exit(0), 2000);
