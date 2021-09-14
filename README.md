# JavaScript-Client

This is the JavaScript Client for Code Game. It works in Node.js and most Browsers.

## Usage

### Nodejs / JavaScript

```javascript
// import the `CodeGameSocket` class into your module
const { CodeGameSocket } = require('@code-game-project/javascript-client');

// create a new instance
const socket = new CodeGameSocket({
	username: 'your-username',
	token: 'your-api-token',
	wsURL: 'http://ws1.code-game.example.com/some-game',
	verbose: true,
});

// wait until connected
socket.on('ready', () => {
	// add your code here
});
```

### Nodejs / TypeScript

```typescript
// import the `CodeGameSocket` class into your module
import { CodeGameSocket } from '@code-game-project/javascript-client';

// create a new instance
const socket = new CodeGameSocket({
	username: 'your-username',
	token: 'your-api-token',
	wsURL: 'http://ws1.code-game.example.com/some-game',
	verbose: true,
});

// wait until connected
socket.on('ready', () => {
	// add your code here
});
```

### Browser Module Syntax

```html
<script type="module">
	// import the `CodeGameSocket` class into your module
	import { CodeGameSocket } from './node_modules/@code-game-project/javascript-client/dist/browser/index.js';

	// create a new instance
	const socket = new CodeGameSocket({
		username: 'your-username',
		token: 'your-api-token',
		wsURL: 'http://ws1.code-game.example.com/some-game',
		verbose: true,
	});

	// wait until connected
	socket.on('ready', () => {
		// add your code here
	});
</script>
```
