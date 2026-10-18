import type {Metadata} from 'next';
const title='Potionpendium · by ureka games';
const description='Brew potions, spark magical combos, and climb the alchemist ranks.';
const image={url:'/social/potionpendium-share-v1.png',width:1200,height:630,alt:'Potionpendium potion puzzle with colorful gems and magical bottles, by ureka games.'};
export const metadata:Metadata={
 metadataBase:new URL('https://potionpendium.vercel.app'),title,description,
 icons:{icon:'/favicon.svg'},alternates:{canonical:'/'},
 openGraph:{type:'website',url:'/',siteName:'Potionpendium',title,description,images:[image]},
 twitter:{card:'summary_large_image',title,description,images:[image]},
};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
