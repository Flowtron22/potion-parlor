import type {Metadata} from 'next';
export const metadata:Metadata={title:'Potionpendium · by ureka games',description:'A cozy potion puzzle with magical brew combos and shared rankings.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
