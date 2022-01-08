/**
 * This test checks if a file with game-specific events (events.d.ts) will work with the javascript-client in a Node.js/TypeScript environment using `@code-game-project/snake-server`'s events.
 */

import { argv, exit } from 'process';
import { CodeGameSocket, ReadyEvent } from '../../src/index';
import { SendableSnakeEvents, ReceiveableSnakeEvents, SnakeDetails, Spawn, MoveForward, Turn } from './events';

const socket = new CodeGameSocket<SendableSnakeEvents, ReceiveableSnakeEvents>({
	username: 'username',
	gameId: 'new',
	wsURL: 'ws://localhost:8082/ws',
	verbose: true
});

socket.on<ReadyEvent>('ready', () => {
	socket.emit<Spawn>('spawn');
	socket.emit<MoveForward>('move_forward');
	socket.emit<Turn>('turn', { direction: 'left' });
	for (let i = 0; i < 5; i++) {
		socket.emit<MoveForward>('move_forward');
	}
	socket.emit<Turn>('turn', { direction: 'right' });
	socket.emit<MoveForward>('move_forward');
});

socket.on<SnakeDetails>('snake_details', (details) => console.log(details.event.covered_squares));

if (!(argv[2] == "stay-alive")) setTimeout(() => exit(), 5000);
