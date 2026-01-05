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

builder.defineCatalogHandler(async () => {
    try {
        const res = await fetch('https://i.mjh.nz/au/Brisbane/raw.json');
        const data = await res.json();
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
                description: 'Live AU Sports'
            }));
        return { metas };
    } catch (e) {
        return { metas: [] };
    }
});

builder.defineMetaHandler(async (args) => {
    const res = await fetch('https://i.mjh.nz/au/Brisbane/raw.json');
    const data = await res.json();
    const id = args.id.replace('ausports_', '');
    const ch = data.channels[id];
    return { meta: ch ? { id: args.id, type: 'tv', name: ch.name, poster: ch.logo } : {} };
});

builder.defineStreamHandler(async (args) => {
    const res = await fetch('https://i.mjh.nz/au/Brisbane/raw.json');
    const data = await res.json();
    const id = args.id.replace('ausports_', '');
    const ch = data.channels[id];
    return { streams: ch ? [{ url: ch.url, title: 'Live' }] : [] };
});

const router = getRouter(builder.getInterface());

module.exports = (req, res) => {
    router(req, res, () => { res.status(404).send('Not found'); });
};
