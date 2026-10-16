'use strict';
self.window=self;
importScripts('vendor/matter.min.js','physics.js','level-builder.js');
self.onmessage=event=>{const {id,level}=event.data;try{const data=self.PotionLevels.generate(level);self.postMessage({id,level,data});}catch(error){self.postMessage({id,level,error:error.message});}};
