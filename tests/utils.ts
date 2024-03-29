import { trimURL } from '../dist/utils.js';

// premium unit testing library
let test = 0;
function eq(output: any, target: any) {
  test++;
  if (output === target) console.log(`test ${test}: ok`);
  else console.error(`test ${test}: failed\n  output: ${output}\n  target: ${target}`);
}

// protocol removal
eq(trimURL('http://localhost:8080'), 'localhost:8080');
eq(trimURL('wss://localhost:2345'), 'localhost:2345');
eq(trimURL('abcdefghijkl://localhost:4632'), 'localhost:4632');

// trailing slash removal
eq(trimURL('http://localhost:8080/'), 'localhost:8080');
eq(trimURL('http://localhost:3246/game'), 'localhost:3246/game');
eq(trimURL('http://localhost:2345/game/'), 'localhost:2345/game');
