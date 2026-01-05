const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const manifest = {
    id: 'com.au.sports.fixed',
    version: '1.0.0',
    name: 'AU Sports Live',
    description: 'Direct AU Sports Feeds',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    idPrefixes: ['ausports_'],
    catalogs: [
        { type: 'tv', id: 'ausports_cat', name: 'AU Sports' }
    ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async () => {
    try {
        const res = await fetch('https://i.mjh.nz/au/Brisbane/raw.json');
        const data = await res.json();
        const metas = Object.keys(data.channels)
            .filter(key => {
                const name = data.channels[key].name.toLowerCase();
                const group = (data.channels[key].group || "").toLowerCase();
                return name.includes('sport') || name.includes('fox') || name.includes('kayo') || group.includes('sport');
            })
            .map(key => ({
                id: `ausports_${key}`,
                type: 'tv',
                name: data.channels[key].name,
                poster: data.channels[key].logo,
                description: 'Live Sports Feed'
            }));

        return { metas };
    } catch (e) {
        return { metas: [] };
    }
});

builder.defineMetaHandler(async (args) => {
    const res = await fetch('
