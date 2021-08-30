const { CodeGameSocket } = require('../dist/index.js');

const socket = new CodeGameSocket({
    username: 'username',
    token: 'api-token',
    wsURL: 'http://localhost:8081/snake',
    verbose: true,
});

socket.on('ready', () => {
    socket.emit('spawn');
    socket.emit('move_forward');
});

setTimeout(() => process.exit(), 5000);