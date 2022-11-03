import { createSocket, Verbosity } from "../dist/node.js";

const socket = createSocket("localhost:8080", Verbosity.INFO);
const { gameId, joinSecret } = await socket.create(true, true);
await socket.join(gameId, "test", joinSecret);

console.log(await socket.fetchGameMetadata());
console.log(socket.getSession());
