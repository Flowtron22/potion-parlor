const fs=require('fs');fs.mkdirSync('server',{recursive:true});
fs.copyFileSync('public/play/vendor/matter.min.js','server/matter.cjs');
fs.writeFileSync('server/physics.mjs',"import Matter from './matter.cjs';\n"+fs.readFileSync('public/play/physics.js','utf8').replace('window.GemPhysics=GemPhysics;','export {GemPhysics};'));
fs.writeFileSync('server/scoring.mjs',fs.readFileSync('public/play/scoring.js','utf8').replace('globalThis.PotionScore=','export const PotionScore='));
fs.writeFileSync('server/rules.mjs',fs.readFileSync('public/play/rules.js','utf8').replace('globalThis.PotionRules=','export const PotionRules='));
fs.writeFileSync('server/challenge.mjs',fs.readFileSync('public/play/challenge.js','utf8').replace('globalThis.PotionChallenge=','export const PotionChallenge='));
