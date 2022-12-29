import { createSocket, Verbosity, type Session } from '../dist/node.js';

type Commands = { name: 'test', data?: undefined; };
type Events = { name: 'tested', data: { property: 123; }; };
type Config = { reallySpecificProperty: string; };

// create and join
const socket = createSocket<Commands, Events, Config>('localhost:8080', Verbosity.INFO);
const { gameId, joinSecret } = await socket.create(true, true);
await socket.join(gameId, 'test', joinSecret);

// available data
console.log((await socket.fetchGameMetadata()));
console.log(((await socket.fetchGameMetadata())?.config?.reallySpecificProperty));
console.log(socket.getSession());

// regular events and commands
const listenerId = socket.on('tested', (data) => { data.property; });
socket.send('test');
console.log('[remove] This should be true:', socket.removeListener(listenerId));
console.log('[remove] This should be false:', socket.removeListener(listenerId));

// raw events (part 1)
const rawListenerId = socket.addRawWebsocketEventListener('close', () => console.log('Closing was detected.'));

// reconnect and disconnect
const { player_id, player_secret } = socket.getSession() as Session;
await socket.connect(gameId, player_id, player_secret);
socket.disconnect();

// raw events (part 2)
console.log('[remove raw] this should be true:', socket.removeRawWebsocketEventListener(rawListenerId));
console.log('[remove raw] this should be false:', socket.removeRawWebsocketEventListener(rawListenerId));

// @ts-ignore
setTimeout(() => process.exit(0), 2000);
