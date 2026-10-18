import {env} from 'cloudflare:workers';
import levels from './levels.json';
import {createLeaderboardAPI} from './leaderboard-api.mjs';
export const start=(request:Request)=>createLeaderboardAPI(env.DB!,levels).start(request);
export const submit=(request:Request)=>createLeaderboardAPI(env.DB!,levels).submit(request);
export const leaderboard=(request:Request)=>createLeaderboardAPI(env.DB!,levels).leaderboard(request);
