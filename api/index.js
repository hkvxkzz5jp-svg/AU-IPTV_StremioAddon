const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const manifest = {
    id: 'com.au.sports.final.fixed',
    version: '1.0.1',
    name: 'AU Sports Live',
    description: 'Australian Sports Channels',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    idPrefixes: ['ausports_'],
    catalogs: [
        {
            type: 'tv',
            id: 'ausports_cat',
            name: 'AU Sports'
        }
    ]
};

const builder = new addonBuilder(manifest);

// Standard fetcher
async function fetchChannels() {
    const res = await fetch('https://i.mjh.nz/au/Brisbane/raw.json');
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    return data.channels || {};
}

builder.defineCatalogHandler(async (args) => {
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
                posterShape: 'square', // Helps apps like Omni render correctly
                description: 'Live Feed'
            }));

        return { metas, cacheMaxAge: 3600 };
    } catch (e) {
        return { metas: [] };
    }
});

builder.defineMetaHandler(async (args) => {
    const channels = await fetchChannels();
    const id = args.id.replace('ausports_', '');
    const ch = channels[id];
    if (ch) {
        return {
            meta: {
                id: args.id,
                type: 'tv',
                name: ch.name,
                poster: ch.logo,
                posterShape: 'square',
                background: ch.logo,
                description: `Live Stream: ${ch.name}`
            }
        };
    }
    return { meta: {} };
});

builder.defineStreamHandler(async (args) => {
    const channels = await fetchChannels();
    const id = args.id.replace('ausports_', '');
    const ch = channels[id];
    return { 
        streams: ch ? [{ url: ch.url, title: 'Live Stream' }] : [] 
    };
});

const router = getRouter(builder.getInterface());

module.exports = (req, res) => {
    // FORCE HEADERS - Omni needs these to trust the "format"
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    router(req, res, () => {
        res.status(404).send('Not found');
    });
};
