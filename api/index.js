const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const manifest = {
    id: 'com.au.sports.fixed.final',
    version: '1.5.0',
    name: 'AU Sports Live',
    description: 'Australian Sports Channels',
    resources: ['catalog', 'stream'],
    types: ['tv'],
    idPrefixes: ['ausports_'],
    catalogs: [{ type: 'tv', id: 'ausports_cat', name: 'AU Sports' }]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
    try {
        const res = await fetch('https://i.mjh.nz/au/Sydney/raw.json');
        const data = await res.json();
        
        // Convert the object into a list Stremio understands
        const metas = Object.keys(data.channels)
            .filter(key => {
                const name = data.channels[key].name.toLowerCase();
                return name.includes('sport') || name.includes('fox') || name.includes('kayo');
            })
            .map(key => ({
                id: `ausports_${key}`,
                type: 'tv',
                name: data.channels[key].name,
                poster: data.channels[key].logo,
                posterShape: 'square'
            }));

        return { metas };
    } catch (e) {
        return { metas: [] };
    }
});

builder.defineStreamHandler(async (args) => {
    try {
        const res = await fetch('https://i.mjh.nz/au/Sydney/raw.json');
        const data = await res.json();
        const id = args.id.replace('ausports_', '');
        const ch = data.channels[id];
        return { streams: ch ? [{ url: ch.url, title: 'Live Stream' }] : [] };
    } catch (e) {
        return { streams: [] };
    }
});

const addonInterface = builder.getInterface();
const router = getRouter(addonInterface);

module.exports = (req, res) => {
    // These 3 lines are the "magic" for Omni/Stremio
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    router(req, res, () => {
        res.statusCode = 404;
        res.end();
    });
};
