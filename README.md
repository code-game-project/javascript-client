# JavaScript-Client

![CodeGame Specification Version](https://img.shields.io/badge/CodeGame_Specification-v0.7-orange)

This is the JavaScript (and TypeScript) client library for [CodeGame](https://code-game.org/).

## Installation

```bash
npm install @code-game-project/client
```

## Usage

```javascript
// import the `createSocket` function
import { createSocket, Verbosity } from '@code-game-project/client';

// Node.js only: Get the command line arguments (`node your-script.js cg.example.com joe 1234-5678`)
let [host, username, gameId, joinSecret] = process.argv.slice(2)

// Browser only: Get the query parameters (`http://localhost:8080/?host=cg.example.com&username=joe&game_id=1234-5678`)
const params = new URLSearchParams(window.location.search);
const host = params.get('host');
const username = params.get('username');
let gameId = params.get('game_id');
let joinSecret = params.get('join_secret');

// create a new `Socket` with the 'debug' logging level
const socket = createSocket(host, Verbosity.DEBUG);

// listen for some event
socket.on('some_event', (data) => {
	// send a command in response
	socket.send('an_event', {
		some: 'data'
	});
});

// declare an anonymous asynchronous function or use top-level await
(async () => {
	try {
		// try to restore the session
		await socket.restoreSession(username);
	} catch (err) {
		// create a new public game if no game ID was specified
		if (!gameId) ({ gameId, joinSecret } = (await socket.create(true, true)));
		// join the game
		await socket.join(gameId, username);
	}
})();
```

## License

MIT License

Copyright (c) 2022 CodeGame Contributors (https://github.com/orgs/code-game-project/people)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
