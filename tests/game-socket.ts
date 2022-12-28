import { createSocket, Verbosity, type Session } from "../dist/node.js";

type Commands = { name: "test"; };
type Events = { name: "tested"; };
type Config = { reallySpecificProperty: string; };

// create and join
const socket = createSocket<Commands, Events, Config>("localhost:8080", Verbosity.INFO);
const { gameId, joinSecret } = await socket.create(true, true);
await socket.join(gameId, "test", joinSecret);

// available data
console.log((await socket.fetchGameMetadata()));
console.log(((await socket.fetchGameMetadata())?.config?.reallySpecificProperty));
console.log(socket.getSession());

// reconnect and disconnect
const { player_id, player_secret } = socket.getSession() as Session;
await socket.connect(gameId, player_id, player_secret);
socket.disconnect();

// @ts-ignore
setTimeout(() => process.exit(0), 2000);
