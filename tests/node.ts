/**
 * This test checks if the javascript-client works in a Node.js/TypeScript environment.
 */

import { CodeGameSocket, ReadyEvent } from '../dist/index.js';
import { argv, exit } from 'process';

const socket = new CodeGameSocket({
    username: 'username',
    gameId: 'new',
    wsURL: 'ws://localhost:8082/ws',
    verbose: true
});

socket.on<ReadyEvent>('ready', () => {
    console.log('ready to do stuff!');
});

if (!(argv[2] == "stay-alive")) setTimeout(() => exit(), 5000);
