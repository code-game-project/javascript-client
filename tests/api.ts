import { api } from '../dist/node.js';
import fetch from 'node-fetch';
const f = fetch as typeof window.fetch;

const {
  getInfo,
  getEvents,
  getGames,
  createGame,
  getGameMetadata,
  getPlayers,
  createPlayer,
  getPlayer
} = api;

const HOST = 'http://localhost:8080';

// information
console.log('[getInfo]:', await getInfo(f, HOST));
console.log('[getEvents]:', await getEvents(f, HOST));

// game
const game = await createGame(f, HOST, { public: true, protected: true });
console.log('[createGame]:', game);
console.log('[getGames]:', await getGames(f, HOST));

// player
let player_id: string | undefined = undefined;
if (!game.data) console.warn('Skipping `createPlayer` because `game.data` is undefined.');
else {
  const player = await createPlayer(f, { game_id: game.data.game_id }, HOST, {
    username: 'tester', join_secret: game.data.join_secret
  });
  player_id = player.data?.player_id;
  console.log('[createPlayer]:', player);
}

if (!game.data) console.warn('Skipping `getPlayer` because `game.data` is undefined.');
else if (!player_id) console.warn('Skipping `getPlayer` because `player_id` is undefined.');
else console.log('[getPlayer]:', await getPlayer(f, { game_id: game.data.game_id, player_id }, HOST));

if (!game.data) console.warn('Skipping `getPlayers` because `game.data` is undefined.');
else console.log('[getPlayers]:', await getPlayers(f, { game_id: game.data.game_id }, HOST));

// metadata
if (!game.data) console.warn('Skipping `getGameMetadata` because `game.data` is undefined.');
else console.log('[getGameMetadata]:', await getGameMetadata(f, { game_id: game.data.game_id }, HOST,));