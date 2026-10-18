// Render the same Outfit / DM Sans wordmark used in the game header.
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),out=new URL('public/social/',root);
const icon=Buffer.from(await fs.readFile(new URL('public/favicon.svg',root))).toString('base64');
const title=await sharp({text:{text:'<span foreground="#f2e9ce" weight="600">Potionpendium</span>',font:'Outfit SemiBold 100',fontfile:fileURLToPath(new URL('public/fonts/Outfit.ttf',root)),rgba:true,dpi:72}}).png().toBuffer();
const credit=await sharp({text:{text:'<span foreground="#b7cfc0" letter_spacing="3500">by ureka games</span>',font:'DM Sans Medium 34',fontfile:fileURLToPath(new URL('public/fonts/DMSans.ttf',root)),rgba:true,dpi:72}}).png().toBuffer();
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="460" viewBox="0 0 1200 460"><rect width="1200" height="460" fill="#294b40"/><image href="data:image/svg+xml;base64,${icon}" x="105" y="108" width="230" height="230"/><image href="data:image/png;base64,${title.toString('base64')}" x="365" y="158"/><image href="data:image/png;base64,${credit.toString('base64')}" x="370" y="276"/></svg>`;
await fs.mkdir(out,{recursive:true});await fs.writeFile(new URL('potionpendium-share-v3.svg',out),svg);await sharp(Buffer.from(svg)).png({compressionLevel:9}).toFile(fileURLToPath(new URL('potionpendium-share-v3.png',out)));
console.log('Created stacked wordmark using the actual header fonts.');
