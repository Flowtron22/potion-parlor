# Deploying Potion Parlor on Vercel

The existing `npm run build` produces a Cloudflare Worker through Vinext. Vercel's Next.js preset needs native Next output under `.next`, including `routes-manifest.json`. Changing the output directory to `dist` does not turn the Worker into a Vercel function.

`vercel.json` selects the Next.js preset, runs `npm run build:vercel`, and uses `.next`. Import the repository with its root directory set to the folder containing `package.json`. Use Node.js 22.x. Keep the checked-in build settings; redeploy after the fix is merged.

The game frontend and Node.js API routes run on Vercel. Shared scores remain in the existing Sites/Cloudflare D1 database at `https://potion-parlor-joran.pedr0kantor.chatgpt.site`. Vercel's three API routes proxy only the game requests and the anonymous `potion_player` cookie to that service. Other cookies and authorization headers are not forwarded. No database secret is needed for this setup.

`POTION_BACKEND_URL` is optional and overrides the backend origin. Keep the existing Sites backend published and public. Moving the database off Sites is a separate migration; Vercel does not provide the Cloudflare `DB` binding.

Local Vercel-runtime check:

```sh
npm run build:vercel
npm run start:vercel
```

Cloudflare/Sites builds continue using `npm run build` and the existing Worker preview command. The Worker handles the three API paths directly with D1; native Next.js routes use the proxy.
