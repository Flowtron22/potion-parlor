// Minimal social artwork: the potion icon, studio credit, and game name.
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const icon=Buffer.from(await fs.readFile(new URL('../public/favicon.svg',import.meta.url))).toString('base64');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="460" viewBox="0 0 1200 460">
 <rect width="1200" height="460" fill="#294b40"/>
 <image href="data:image/svg+xml;base64,${icon}" x="90" y="30" width="196" height="196"/>
 <text x="328" y="126" fill="#f2e9ce" font-family="Arial,sans-serif" font-size="42" letter-spacing="6">BY UREKA GAMES</text>
 <text x="86" y="412" fill="#f2e9ce" font-family="Arial,sans-serif" font-size="138" font-weight="700" letter-spacing="-4">Potionpendium</text>
</svg>`;
const out=new URL('../public/social/',import.meta.url);await fs.mkdir(out,{recursive:true});await fs.writeFile(new URL('potionpendium-share-v2.svg',out),svg);await sharp(Buffer.from(svg)).png({compressionLevel:9}).toFile(fileURLToPath(new URL('potionpendium-share-v2.png',out)));
console.log('Created minimal Potionpendium share image (1200 × 460).');
