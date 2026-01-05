const { addonBuilder, getRouter } = require('stremio-addon-sdk');

// We are hardcoding the most popular ones so it NEVER loads empty
const sportsChannels = [
    { id: 'ausports_kayo_1', name: 'Kayo Sports 1', url: 'https://i.mjh.nz/au/Sydney/tv.kayo.1.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.kayo.1.png' },
    { id: 'ausports_fox_501', name: 'Fox Sports 501', url: 'https://i.mjh.nz/au/Sydney/tv.fox.501.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.fox.501.png' },
    { id: 'ausports_fox_league', name: 'Fox League', url: 'https://i.mjh.nz/au/Sydney/tv.fox.league.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.fox.league.png' },
    { id: 'ausports_fox_footy', name: 'Fox Footy', url: 'https://i.mjh.nz/au/Sydney/tv.fox.footy.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.fox.footy.png' },
    { id: 'ausports_racing_com', name: 'Racing.com', url: 'https://i.mjh.nz/au/Sydney/tv.racing.com.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.racing.com.png' },
    { id: 'ausports_seven_sport', name: '7Sport', url: 'https://i.mjh.nz/au/Sydney/tv.7sport.m3u8', logo: 'https://i.mjh.nz/au/Sydney/tv.7sport.png' }
];

const manifest = {
    id: 'com.au.sports.instant',
    version: '2.0.0',
    name: 'AU Sports Instant',
    description: 'Direct AU Sports (Hardcoded Fix)',
    resources: ['catalog', 'stream'],
    types: ['tv'],
    idPrefixes: ['ausports_'],
    catalogs: [{ type: 'tv', id: 'ausports_cat', name: 'AU Sports' }]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(() => {
    const metas = sportsChannels.map(ch => ({
        id: ch.id,
        type: 'tv',
        name: ch.name,
        poster: ch.logo,
        posterShape: 'square'
    }));
    return Promise.resolve({ metas });
});

builder.defineStreamHandler((args) => {
    const channel = sportsChannels.find(ch => ch.id === args.id);
    return Promise.resolve({ 
        streams: channel ? [{ url: channel.url, title: 'Live Stream' }] : [] 
    });
});

const router = getRouter(builder.getInterface());

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');
    router(req, res, () => { res.status(404).send('Not found'); });
};
