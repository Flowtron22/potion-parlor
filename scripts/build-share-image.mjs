// Social artwork uses the game's real first-board geometry, palette and bottles.
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const board=JSON.parse(await fs.readFile(new URL('../server/levels.json',import.meta.url),'utf8'))[0];
const source=await fs.readFile(new URL('../public/play/game.js',import.meta.url),'utf8');
const bottlePaths=[...source.match(/const BOTTLE_PATHS=\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
const colors=['#f17b91','#efb74e','#7dcfa4','#69c4e5','#b89ae6','#ef9f72'],symbols=['♡','☀','✿','☾','✧','◇'];
const icon=Buffer.from(await fs.readFile(new URL('../public/favicon.svg',import.meta.url))).toString('base64');
function gem(g){
 const r=g.drawRadius||g.radius,x=g.renderX??g.x,y=g.renderY??g.y,a=(g.renderAngle??g.angle??0)*180/Math.PI;
 let body;if(g.shape===0||g.shape===4)body=`<ellipse rx="${r*(g.shape===4?.74:1)}" ry="${r}"/>`;else{const n=[0,4,6,5,0,3][g.shape];body='<polygon points="'+Array.from({length:n},(_,i)=>{const t=i/n*Math.PI*2-Math.PI/2;return Math.cos(t)*r+','+Math.sin(t)*r;}).join(' ')+'"/>';}
 return `<g transform="translate(${x} ${y}) rotate(${a}) scale(1 ${g.aspect})" fill="url(#gem${g.color})" stroke="#def5d8" stroke-opacity=".5" stroke-width="1">${body}<text y="5" text-anchor="middle" fill="#ffffffcc" stroke="none" font-size="${r*.65}" font-family="Georgia">${symbols[g.color]}</text></g>`;
}
function flask(b,x,y,w=33,h=45,filled=true,id='b'+x+y){const path=bottlePaths[b.shape];return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 60 82" preserveAspectRatio="none"><defs><clipPath id="${id}"><path d="${path}"/></clipPath></defs><path d="${path}" fill="#e0fff012" stroke="#bedecd" stroke-width="1.8"/>${filled?`<g clip-path="url(#${id})"><path d="M4 48Q20 44 34 49T56 48V82H4Z" fill="${colors[b.color]}"/><path d="M4 48Q20 44 34 49T56 48" fill="none" stroke="#ffffff99"/></g>`:''}<path d="M23 15V24M18 44V59" fill="none" stroke="#ffffff66" stroke-width="2.3" stroke-linecap="round"/><rect x="16" y="3" width="28" height="8" rx="2" fill="#c5a36b"/><text x="30" y="60" text-anchor="middle" fill="#fff" font-size="15" font-family="Georgia">${symbols[b.color]}</text></svg>`;}
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs>
 <radialGradient id="bg" cx=".3" cy=".25" r="1"><stop stop-color="#31584b"/><stop offset="1" stop-color="#0e2520"/></radialGradient>
 <linearGradient id="panel" x2=".7" y2="1"><stop stop-color="#36594b"/><stop offset="1" stop-color="#1c382f"/></linearGradient>
 <linearGradient id="jar"><stop stop-color="#9bb69c44"/><stop offset=".2" stop-color="#adc9ac08"/><stop offset=".85" stop-color="#d7e3c608"/><stop offset="1" stop-color="#accbaf33"/></linearGradient>
 <filter id="shadow" x="-.4" y="-.4" width="1.8" height="1.8"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#001a13" flood-opacity=".65"/></filter>
 <filter id="glow"><feGaussianBlur stdDeviation="9"/></filter>
 ${colors.map((c,i)=>`<radialGradient id="gem${i}" cx=".3" cy=".2" r=".9"><stop stop-color="#ffffff"/><stop offset=".2" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".65"/></radialGradient>`).join('')}
 <clipPath id="jarClip"><rect x="26" y="16" width="308" height="231" rx="20"/></clipPath>
 </defs><rect width="1200" height="630" fill="url(#bg)"/>
 <circle cx="1020" cy="260" r="290" fill="none" stroke="#dfc47b" stroke-opacity=".07" stroke-width="2"/><circle cx="1020" cy="260" r="255" fill="none" stroke="#dfc47b" stroke-opacity=".05"/>
 <image href="data:image/svg+xml;base64,${icon}" x="65" y="65" width="97" height="97"/>
 <text x="180" y="111" fill="#f2e9ce" font-family="Arial,sans-serif" font-size="20" letter-spacing="3">BY UREKA GAMES</text>
 <text x="66" y="250" fill="#f2e9ce" font-family="Arial,sans-serif" font-size="68" font-weight="700" letter-spacing="-2">Potionpendium</text>
 <text x="69" y="306" fill="#e9c982" font-family="Arial,sans-serif" font-size="31">Brew a little magic.</text>
 <text x="70" y="351" fill="#bcd4c4" font-family="Arial,sans-serif" font-size="22">Potions. Combos. A touch of chaos.</text>
 <path d="M80 470C220 375 238 530 370 454S507 421 550 467" fill="none" stroke="#c187f2" stroke-opacity=".2" stroke-width="17" filter="url(#glow)"/>
 <path d="M80 470C220 375 238 530 370 454S507 421 550 467" fill="none" stroke="#b89ae6" stroke-opacity=".55" stroke-width="2"/>
 ${flask({shape:1,color:4},105,398,59,88,true,'hero1')}${flask({shape:2,color:3},252,416,60,86,true,'hero2')}${flask({shape:4,color:2},414,399,57,89,true,'hero3')}
 <g fill="#e9c982" font-size="22" font-family="Georgia"><text x="197" y="431">✦</text><text x="367" y="502">✧</text><text x="519" y="419">✦</text></g>
 <text x="70" y="574" fill="#9fbcab" font-size="20" font-family="Arial,sans-serif">potionpendium.vercel.app</text>
 <g transform="translate(742 27)"><rect width="377" height="576" rx="29" fill="url(#panel)" stroke="#6b8d72" stroke-opacity=".65" filter="url(#shadow)"/>
 <image href="data:image/svg+xml;base64,${icon}" x="20" y="14" width="31" height="31"/>
 <text x="59" y="31" fill="#f2e9ce" font-size="17" font-family="Arial,sans-serif" font-weight="700">Potionpendium</text><text x="60" y="44" fill="#b7cfc0" font-size="9" font-family="Arial,sans-serif" letter-spacing="1">by ureka games</text>
 <text x="26" y="77" fill="#e9c982" font-size="13" font-family="Arial,sans-serif">✦ 01</text><text x="347" y="77" fill="#b7cfbc" text-anchor="end" font-size="11" font-family="Arial,sans-serif">0 / ${board.bottleCount}</text>
 <text x="26" y="107" fill="#f2e9ce" font-size="25" font-family="Arial,sans-serif" font-weight="700">0</text><rect x="57" y="87" width="32" height="23" rx="7" fill="none" stroke="#b49a61"/><text x="73" y="103" text-anchor="middle" fill="#e9c982" font-size="11" font-family="Arial,sans-serif">×1</text>
 <rect x="25" y="119" width="327" height="3" rx="1" fill="#102b22"/>
 <g transform="translate(8 128)"><rect x="22" y="12" width="316" height="241" rx="24" fill="#142e27" stroke="#9bb99c66" stroke-width="2" filter="url(#shadow)"/><rect x="22" y="12" width="316" height="241" rx="24" fill="url(#jar)"/><g clip-path="url(#jarClip)">${board.columns.flat().map(gem).join('')}<rect x="30" y="30" width="3" height="195" rx="2" fill="#ffffff14"/></g><rect x="23" y="4" width="23" height="9" rx="2" fill="#c5b477"/><rect x="314" y="4" width="23" height="9" rx="2" fill="#c5b477"/></g>
 ${Array.from({length:5},(_,i)=>`<rect x="${25+i*67}" y="400" width="60" height="62" rx="9" fill="#16342b" stroke="#6e8d6b66"/>${i<3?flask(board.queue[i],38+i*67,405,34,46,true,'shelf'+i):`<text x="${55+i*67}" y="437" text-anchor="middle" fill="#66846766" font-size="19">✧</text>`}`).join('')}
 <g transform="translate(25 478)">${Array.from({length:14},(_,i)=>{const x=i%7*47,y=Math.floor(i/7)*36;const b=board.queue[i];return `<rect x="${x}" y="${y}" width="45" height="33" rx="4" fill="#284238" stroke="#6e8d6b44"/>${i<3?flask(b,x+13,y+1,21,30,true,'queue'+i):`<rect x="${x+17}" y="${y+7}" width="12" height="19" rx="2" fill="#365448" stroke="#78978255"/>`}`;}).join('')}</g>
 </g></svg>`;
const out=new URL('../public/social/',import.meta.url);await fs.mkdir(out,{recursive:true});await fs.writeFile(new URL('potionpendium-share-v1.svg',out),svg);await sharp(Buffer.from(svg)).png({compressionLevel:9}).toFile(fileURLToPath(new URL('potionpendium-share-v1.png',out)));
console.log('Created public/social/potionpendium-share-v1.png (1200 × 630).');
