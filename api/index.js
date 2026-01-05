const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const manifest = {
    id: 'com.au.sports.live.fix',
    version: '1.0.0',
    name: 'AU Sports Live',
    description: 'Live AU Sports Feeds',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    idPrefixes: ['ausports_'],
    catalogs: [{ type: 'tv', id: 'ausports_cat', name: 'AU Sports' }]
};

const builder = new addonBuilder(manifest);

// Helper to fetch data
async function fetchChannels() {
    const res = await fetch('https://i.mjh.nz/au/Brisbane/raw.json');
    const data = await res.json();
    return data.channels || {};
}

builder.defineCatalogHandler(async () => {
    try {
        const channels = await fetchChannels();
        const metas = Object.keys(channels)
            .filter(key => {
                const name = channels[key].name.toLowerCase();
                return name.includes('sport') || name.includes('fox') || name.includes('kayo');
            })
            .map(key => ({
                id: `ausports_${key}`,
                type: 'tv',
                name: channels[key].name,
                poster: channels[key].logo,
                description: 'Live Sports'
            }));
        return { metas };
    } catch (e) { return { metas: [] }; }
});

builder.defineMetaHandler(async (args) => {
    const channels = await fetchChannels();
    const id = args.id.replace('ausports_', '');
    const ch = channels[id];
    return { meta: ch ? { id: args.id, type: 'tv', name: ch.name, poster: ch.logo } : {} };
});

builder.defineStreamHandler(async (args) => {
    const channels = await fetchChannels();
    const id = args.id.replace('ausports_', '');
    const ch = channels[id];
    return { streams: ch ? [{ url: ch.url, title: 'Live Stream' }] : [] };
});

const router = getRouter(builder.getInterface());

module.exports = (req, res) => {
    // ESSENTIAL FOR APPS LIKE OMNI
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // Handle the "Pre-check" from Omni
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    router(req, res, () => {
        res.status(404).send('Not found');
    });
};
