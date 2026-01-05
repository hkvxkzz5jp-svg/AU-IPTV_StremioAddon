const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const sportsChannels = [
    { id: 'ausports_kayo1', name: 'Kayo Sports 1', url: 'https://i.mjh.nz/au/Sydney/tv.kayo.1.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.kayo.1.png' },
    { id: 'ausports_fox501', name: 'Fox Sports 501', url: 'https://i.mjh.nz/au/Sydney/tv.fox.501.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.fox.501.png' },
    { id: 'ausports_foxleague', name: 'Fox League', url: 'https://i.mjh.nz/au/Sydney/tv.fox.league.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.fox.league.png' },
    { id: 'ausports_foxfooty', name: 'Fox Footy', url: 'https://i.mjh.nz/au/Sydney/tv.fox.footy.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.fox.footy.png' }
];

const builder = new addonBuilder({
    id: 'com.au.sports.final.ultra',
    version: '3.5.0',
    name: 'AU Sports Live',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    idPrefixes: ['ausports_'],
    catalogs: [{ type: 'tv', id: 'ausports_cat', name: 'AU Sports' }]
});

builder.defineCatalogHandler(() => Promise.resolve({ metas: sportsChannels.map(ch => ({ id: ch.id, type: 'tv', name: ch.name, poster: ch.logo })) }));
builder.defineMetaHandler((args) => {
    const ch = sportsChannels.find(c => c.id === args.id);
    return Promise.resolve({ meta: ch ? { id: ch.id, type: 'tv', name: ch.name, poster: ch.logo } : {} });
});

builder.defineStreamHandler((args) => {
    const ch = sportsChannels.find(c => c.id === args.id);
    if (ch) {
        return Promise.resolve({
            streams: [{
                title: 'Live Stream (Sydney)',
                url: ch.url,
                behaviorHints: { 
                    isLive: true,
                    // These headers help bypass "Unsupported" errors in some players
                    proxyHeaders: { "User-Agent": "Mozilla/5.0", "Referer": "https://i.mjh.nz/" }
                }
            }]
        });
    }
    return Promise.resolve({ streams: [] });
});

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    getRouter(builder.getInterface())(req, res, () => res.status(404).end());
};
