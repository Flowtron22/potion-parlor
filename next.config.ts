import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  async redirects(){
    return [
      {source:'/play',destination:'/',permanent:true},
      {source:'/play/index.html',destination:'/',permanent:true},
    ];
  },
  async rewrites(){
    return {beforeFiles:[{source:'/',destination:'/index.html'}]};
  },
};
export default nextConfig;
