const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const sportsChannels = [
    { id: 'ausports_kayo1', name: 'Kayo Sports 1', url: 'https://i.mjh.nz/au/Sydney/tv.kayo.1.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.kayo.1.png' },
    { id: 'ausports_fox501', name: 'Fox Sports 501', url: 'https://i.mjh.nz/au/Sydney/tv.fox.501.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.fox.501.png' },
    { id: 'ausports_foxleague', name: 'Fox League', url: 'https://i.mjh.nz/au/Sydney/tv.fox.league.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.fox.league.png' },
    { id: 'ausports_foxfooty', name: 'Fox Footy', url: 'https://i.mjh.nz/au/Sydney/tv.fox.footy.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.fox.footy.png' }
];

const manifest = {
    id: 'com.au.sports.fixed.playback',
    version: '2.5.0',
    name: 'AU Sports Live',
    description: 'Live AU Sports (Fixed Playback)',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    idPrefixes: ['ausports_'],
    catalogs: [{ type: 'tv', id: 'ausports_cat', name: 'AU Sports' }]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(() => {
    return Promise.resolve({
        metas: sportsChannels.map(ch => ({
            id: ch.id,
            type: 'tv',
            name: ch.name,
            poster: ch.logo,
            posterShape: 'square'
        }))
    });
});

builder.defineMetaHandler((args) => {
    const ch = sportsChannels.find(c => c.id === args.id);
    return Promise.resolve({
        meta: ch ? { id: ch.id, type: 'tv', name: ch.name, poster: ch.logo, posterShape: 'square' } : {}
    });
});

builder.defineStreamHandler((args) => {
    const ch = sportsChannels.find(c => c.id === args.id);
    if (ch) {
        return Promise.resolve({
            streams: [{
                title: 'Direct HLS Stream',
                url: ch.url,
                behaviorHints: {
                    isLive: true,
                    notWebReady: false // Tells Stremio it's okay for web/app players
                }
            }]
        });
    }
    return Promise.resolve({ streams: [] });
});

const router = getRouter(builder.getInterface());

module.exports = (req, res) => {
    // ESSENTIAL: These headers tell Omni it's safe to play the video
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    router(req, res, () => { res.status(404).send('Not found'); });
};
