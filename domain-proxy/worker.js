// Serves the BC EMR/PCP prep site on a custom domain while the GitHub Pages address keeps working unchanged.
// Every request is passed straight through to GitHub Pages, so a push to main updates both addresses; nothing is stored here.
//   /…            → https://firefoxy1015.github.io/nancy-quiz-web/…
//   /aet-audio…/… → https://firefoxy1015.github.io/aet-audio…/…   (narration repos the class reaches as ../aet-audioN/)
//   /aet-class-data/… → https://firefoxy1015.github.io/aet-class-data/…   (class vaults and slide images, ../aet-class-data/)
const UPSTREAM = 'https://firefoxy1015.github.io';
const SITE = '/nancy-quiz-web';
const SIBLING = /^\/(aet-audio\d*|aet-class-data)\//;
const PASS = ['accept', 'accept-encoding', 'accept-language', 'range', 'if-none-match', 'if-modified-since', 'user-agent'];

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }
    const url = new URL(request.url);
    // www.bcmedicprep.com → bcmedicprep.com, so progress saved in the browser lives under one address.
    if (url.hostname.startsWith('www.')) {
      return Response.redirect('https://' + url.hostname.slice(4) + url.pathname + url.search, 301);
    }
    const path =SIBLING.test(url.pathname) ? url.pathname : SITE + url.pathname;
    const headers = new Headers();
    for (const h of PASS) { const v = request.headers.get(h); if (v) headers.set(h, v); }
    const res = await fetch(UPSTREAM + path + url.search, { method: request.method, headers, redirect: 'manual' });
    const out = new Response(res.body, res);
    // GitHub Pages redirects folders to a trailing slash (…/v1 → …/v1/); point those back at this domain.
    const loc = res.headers.get('location');
    if (loc) {
      const to = new URL(loc, UPSTREAM + path);
      if (to.origin === UPSTREAM) {
        let p = to.pathname;
        if (p === SITE || p.startsWith(SITE + '/')) p = p.slice(SITE.length) || '/';
        out.headers.set('location', url.origin + p + to.search + to.hash);
      }
    }
    return out;
  },
};
