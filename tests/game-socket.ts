import { createSocket, Verbosity, type Session } from '../dist/node.js';

type Commands = { name: 'test', data?: undefined; };
type Events = { name: 'tested', data: { property: 123; }; };
type Config = { reallySpecificProperty: string; };

// create and join
const socket = createSocket<Commands, Events, Config>('localhost:8080', Verbosity.INFO);
const { gameId, joinSecret } = await socket.create(true, true);
await socket.join(gameId, 'test', joinSecret);

// available data
console.log('[available data] This will be `null` if joining fails, else it will be a JSON object:', (await socket.fetchGameMetadata()));
console.log('[available data] This will likely be `undefined`:', ((await socket.fetchGameMetadata())?.config?.reallySpecificProperty)); // this is mostly an intellisense check
console.log('[available data] This will be a JSON object of credentials:', socket.getSession());

// regular events and commands
const listenerId = socket.on('tested', (data) => { data.property; });
socket.send('test');
console.log('[remove] This should be true:', socket.removeListener(listenerId));
console.log('[remove] This should be false:', socket.removeListener(listenerId));

// raw events (part 1)
const rawListenerId = socket.addRawListener('close', () => console.log('Closing was detected.'));

// reconnect and disconnect
const { player_id, player_secret } = socket.getSession() as Session;
await socket.connect(gameId, player_id, player_secret);
socket.disconnect();

// raw events (part 2)
console.log('[remove raw] this should be true:', socket.removeRawListener(rawListenerId));
console.log('[remove raw] this should be false:', socket.removeListener(rawListenerId));

// @ts-ignore
setTimeout(() => process.exit(0), 2000);
