const { addonBuilder } = require('stremio-addon-sdk');
const channels = require('./channels.json');

const manifest = {
    id: 'com.joshargh.auiptv.custom',
    version: '1.0.0',
    name: 'AU IPTV (Sports Fixed)',
    description: 'Australian IPTV with Fixed Sports for Omni',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    idPrefixes: ['auiptv_'],
    catalogs: [
        {
            type: 'tv',
            id: 'auiptv_all',
            name: 'AU IPTV - All'
        },
        {
            type: 'tv',
            id: 'auiptv_sports',
            name: 'AU IPTV - Sports'
        }
    ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler((args) => {
    let results = channels;
    if (args.id === 'auiptv_sports') {
        results = channels.filter(c => c.group === 'Sports');
    }
    
    return Promise.resolve({
        metas: results.map(c => ({
            id: `auiptv_${c.id}`,
            type: 'tv',
            name: c.name,
            poster: c.logo,
            background: c.logo,
            description: `Category: ${c.group}`
        }))
    });
});

builder.defineMetaHandler((args) => {
    const channel = channels.find(c => `auiptv_${c.id}` === args.id);
    if (channel) {
        return Promise.resolve({
            meta: {
                id: `auiptv_${channel.id}`,
                type: 'tv',
                name: channel.name,
                poster: channel.logo,
                description: `Watch ${channel.name} live.`
            }
        });
    }
    return Promise.resolve({ meta: {} });
});

builder.defineStreamHandler((args) => {
    const channel = channels.find(c => `auiptv_${c.id}` === args.id);
    if (channel) {
        return Promise.resolve({
            streams: [{ url: channel.url, title: 'Live Stream' }]
        });
    }
    return Promise.resolve({ streams: [] });
});

// --- DELETE THE OLD module.exports LINE AND PASTE THIS INSTEAD ---
const addonInterface = builder.getInterface();
const { getRouter } = require('stremio-addon-sdk');
const router = getRouter(addonInterface);

module.exports = (req, res) => {
    router(req, res, () => {
        res.status(404).send('Not found');
    });
};
