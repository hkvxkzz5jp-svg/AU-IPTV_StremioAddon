const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const builder = new addonBuilder({
    id: 'com.au.sports.fixed',
    version: '1.0.0',
    name: 'AU Sports Live',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    idPrefixes: ['ausports_'],
    catalogs: [{ type: 'tv', id: 'ausports_cat', name: 'AU Sports' }]
});

async function fetchChannels() {
    const res = await fetch('https://i.mjh.nz/au/Brisbane/raw.json');
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    return data.channels || {};
}

builder.defineCatalogHandler(async () => {
    try {
        const channels = await fetchChannels();
        const metas = Object.keys(channels)
            .filter(key => {
                const name = channels[key].name.toLowerCase();
                const group = (channels[key].group || "").toLowerCase();
                return name.includes('sport') || name.includes('fox') || name.includes('kayo') || group.includes('sport');
            })
            .map(key => ({
                id: `ausports_${key}`,
                type: 'tv',
                name: channels[key].name,
                poster: channels[key].logo,
                description: 'Live AU Sports'
            }));
        return { metas };
    } catch (e) {
        console.error(e);
        return { metas: [] };
    }
});

builder.defineMetaHandler(async (args) => {
    try {
        const channels = await fetchChannels();
        const id = args.id.replace('ausports_', '');
        const ch = channels[id];
        return { meta: ch ? { id: args.id, type: 'tv', name: ch.name, poster: ch.logo } : {} };
    } catch (e) {
        return { meta: {} };
    }
});

builder.defineStreamHandler(async (args) => {
    try {
        const channels = await fetchChannels();
        const id = args.id.replace('ausports_', '');
        const ch = channels[id];
        return { streams: ch ? [{ url: ch.url, title: 'Live' }] : [] };
    } catch (e) {
        return { streams: [] };
    }
});

const router = getRouter(builder.getInterface());

module.exports = (req, res) => {
    // These lines tell Omni "You are allowed to read this data"
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');
    
    router(req, res, () => { 
        res.status(404).send('Not found'); 
    });
};
