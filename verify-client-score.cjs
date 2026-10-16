import('./verify-blocked.mjs').then(m=>m.runChecks()).catch(e=>{console.error(e);process.exitCode=1});
