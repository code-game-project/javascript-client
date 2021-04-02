# JavaScript-Client

This is the JavaScript Client for Code Game. It works in Nodejs and most Browsers.

## Usage

### Nodejs / JavaScript

```javascript
// import the `CodeGameSocket` class into your module
const { CodeGameSocket } = require('@code-game-project/javascript-client');

// create a new instance
const socket = new CodeGameSocket({
	token: 'your-api-token',
	wsURL: 'ws://ws1.code-game.example.com:8081/',
	verbose: true,
});
```

### Nodejs / TypeScript

```javascript
// import the `CodeGameSocket` class into your module
import { CodeGameSocket } from '@code-game-project/javascript-client';

// create a new instance
const socket = new CodeGameSocket({
	token: 'your-api-token',
	wsURL: 'ws://ws1.code-game.example.com:8081/',
	verbose: true,
});
```

### Browser

```html
<!-- makes `CodeGameSocket` accessable globally (as `window.CodeGameSocket`) -->
<script src="./node_modules/@code-game-project/javascript-client/dist/index.js"></script>
<!-- create a new instance -->
<script>
	const socket = new CodeGameSocket({
		token: 'abc',
		wsURL: 'ws://localhost:8081/',
		verbose: true,
	});
</script>
```
