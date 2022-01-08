/**
 * This test checks if the javascript-client works in a Node.js/JavaScript environment.
 */

const { CodeGameSocket } = require('../dist/index.js');

const socket = new CodeGameSocket({
    username: 'username',
    gameId: 'new',
    wsURL: 'ws://localhost:8082/ws',
    verbose: true
});

socket.on('ready', () => {
    console.log('ready to do stuff!');
});

if (!(process.argv.slice(2) == "stay-alive")) setTimeout(() => process.exit(), 5000);
