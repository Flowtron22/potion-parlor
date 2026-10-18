self.window=self;
importScripts('vendor/matter.min.js','physics.js?v=round11','rules.js','remix.js?v=round11');
self.onmessage=event=>{try{const board=PotionRemix.restart(event.data);delete board.remixPath;self.postMessage({board});}catch(error){self.postMessage({error:error.message});}};
