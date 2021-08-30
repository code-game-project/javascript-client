import { CodeGameSocket } from '../src/index';

const socket = new CodeGameSocket({
	username: 'username',
	token: 'api-token',
	wsURL: 'http://localhost:8081/snake',
	verbose: true,
});

socket.on('ready', () => {
	socket.emit('spawn');
	socket.emit('test', { data: 'something' });
});

// @ts-ignore
if (!(process.argv.slice(2) == "stay-alive")) setTimeout(() => process.exit(), 5000);