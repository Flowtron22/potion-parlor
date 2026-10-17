import assert from 'node:assert/strict';
import {LiquidSurface} from './public/play/liquid-physics.mjs';
const surface=new LiquidSurface();surface.impact(1);surface.step(1/60,60);assert(surface.energy>0);
let points;for(let i=0;i<1200;i++)points=surface.step(1/120,60);
assert(surface.energy<.025);assert(Math.abs(surface.fill-60)<.001);assert.equal(points.length,19);
for(const fps of [30,60,120]){const wave=new LiquidSurface();wave.impact(1);for(let i=0;i<fps*10;i++){const samples=wave.step(1/fps,72);assert(samples.flat().every(Number.isFinite));}assert(Math.abs(wave.fill-72)<.001);assert(wave.energy<.025);}
console.log('PASS: fill boundary and impact waves remain finite and settle at 30/60/120 fps. GPU shader compilation, advection and mixing are checked in the browser.');
