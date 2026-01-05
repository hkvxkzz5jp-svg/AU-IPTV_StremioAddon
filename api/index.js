const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const manifest = {
    id: 'com.joshargh.auiptv.custom',
    version: '1.0.0',
    name: 'AU IPTV (Sports Fixed)',
    description: 'Live AU Channels - Sports Category Forced',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    idPrefixes: ['auiptv_'],
    catalogs: [
        { type: 'tv', id: 'auiptv_all', name: 'AU IPTV - All' },
        { type: 'tv', id: 'auiptv_sports', name: 'AU IPTV - Sports' }
    ]
};

const builder = new addonBuilder(manifest);

async function getChannels() {
    try {
        const res = await fetch('https://i.mjh.nz/au/Brisbane/raw.json');
        const data = await res.json();
        // The data is an object with a 'channels' key
        const channelData = data.channels || {};
        return Object.keys(channelData).map(key => {
            const ch = channelData[key];
            return {
                id: key.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                name: ch.name || key,
                logo: ch.logo || '',
                url: ch.url || '',
                group: ch.group || ''
            };
        });
    } catch (e) {
        console.error("Fetch error:", e);
        return [];
    }
}

builder.defineCatalogHandler(async (args) => {
    const channels = await getChannels();
    let results = channels;

    if (args.id === 'auiptv_sports') {
        results = channels.filter(c => 
            (c.group && c.group.toLowerCase().includes('sport')) || 
            (c.name && c.name.toLowerCase().includes('sport')) ||
            (c.name && c.name.toLowerCase().includes('kayo')) ||
            (c.name && c.name.toLowerCase().includes('fox'))
        );
    }

    return {
        metas: results.map(c => ({
            id: `auiptv_${c.id}`,
            type: 'tv',
            name: c.name,
            poster: c.logo,
            background: c.logo,
            description: `Category: ${c.group || 'Live TV'}`
        }))
    };
});

builder.defineMetaHandler(async (args) => {
    const channels = await getChannels();
    const channel = channels.find(c => `auiptv_${c.id}` === args.id);
    if (channel) {
        return {
            meta: {
                id: `auiptv_${channel.id}`,
                type: 'tv',
                name: channel.name,
                poster: channel.logo,
                description: `Watching ${channel.name} live.`
            }
        };
    }
    return { meta: {} };
});

builder.defineStreamHandler(async (args) => {
    const channels = await getChannels();
    const channel = channels.find(c => `auiptv_${c.id}` === args.id);
    return { streams: channel ? [{ url: channel.url, title: 'Live Stream' }] : [] };
});

const addonInterface = builder.getInterface();
const router = getRouter(addonInterface);

module.exports = (req, res) => {
    router(req, res, () => { res.status(404).send('Not found'); });
};
