const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const manifest = {
    id: 'com.au.sports.direct',
    version: '1.2.0',
    name: 'AU Sports Live',
    description: 'Direct Sports Access (No Config Required)',
    resources: ['catalog', 'stream', 'meta'],
    types: ['tv'],
    idPrefixes: ['ausports_'],
    catalogs: [{ type: 'tv', id: 'ausports_cat', name: 'AU Sports' }]
};

const builder = new addonBuilder(manifest);

// We hardcode the best region (Brisbane/Sydney) to ensure it works without the landing page
const DATA_URL = 'https://i.mjh.nz/au/Brisbane/raw.json';

builder.defineCatalogHandler(async () => {
    try {
        const res = await fetch(DATA_URL);
        const data = await res.json();
        const channels = data.channels || {};
        
        const metas = Object.keys(channels)
            .filter(key => {
                const name = (channels[key].name || "").toLowerCase();
                return name.includes('sport') || name.includes('kayo') || name.includes('fox');
            })
            .map(key => ({
                id: `ausports_${key}`,
                type: 'tv',
                name: channels[key].name,
                poster: channels[key].logo,
                posterShape: 'square'
            }));

        return { metas };
    } catch (e) {
        return { metas: [] };
    }
});

builder.defineMetaHandler(async (args) => {
    const res = await fetch(DATA_URL);
    const data = await res.json();
    const id = args.id.replace('ausports_', '');
    const ch = data.channels[id];
    return { meta: ch ? { id: args.id, type: 'tv', name: ch.name, poster: ch.logo, background: ch.logo, posterShape: 'square' } : {} };
});

builder.defineStreamHandler(async (args) => {
    const res = await fetch(DATA_URL);
    const data = await res.json();
    const id = args.id.replace('ausports_', '');
    const ch = data.channels[id];
    return { streams: ch ? [{ url: ch.url, title: 'Live Stream' }] : [] };
});

const router = getRouter(builder.getInterface());

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    router(req, res, () => { res.status(404).send('Not found'); });
};
