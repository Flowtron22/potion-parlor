self.window=self;
importScripts('vendor/matter.min.js','physics.js?v=progress12','rules.js','remix.js?v=progress12');
self.onmessage=event=>{try{const board=PotionRemix.restart(event.data);delete board.remixPath;self.postMessage({board});}catch(error){self.postMessage({error:error.message});}};
