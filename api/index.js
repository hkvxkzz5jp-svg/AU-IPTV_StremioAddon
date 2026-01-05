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

// This function fetches the live channel list from the internet
async function getChannels() {
    const res = await fetch('https://i.mjh.nz/au/Brisbane/raw.json');
    const data = await res.json();
    return Object.values(data.channels).map(ch => ({
        id: ch.name.toLowerCase().replace(/\s+/g, '-'),
        name: ch.name,
        logo: ch.logo,
        url: ch.url,
        group: ch.group || ''
    }));
}

builder.defineCatalogHandler(async (args) => {
    const channels = await getChannels();
    let results = channels;

    if (args.id === 'auiptv_sports') {
        // This looks for anything with "Sport" in the name or group
        results = channels.filter(c => 
            c.group.toLowerCase().includes('sport') || 
            c.name.toLowerCase().includes('sport') ||
            c.name.toLowerCase().includes('kayo') ||
            c.name.toLowerCase().includes('optus')
        );
    }

    return {
        metas: results.map(c => ({
            id: `auiptv_${c.id}`,
            type: 'tv',
            name: c.name,
            poster: c.logo,
            background: c.logo,
            description: `Live from AU`
        }))
    };
});

builder.defineStreamHandler(async (args) => {
    const channels = await getChannels();
    const channel = channels.find(c => `auiptv_${c.id}` === args.id);
    return { streams: channel ? [{ url: channel.url }] : [] };
});

const addonInterface = builder.getInterface();
const router = getRouter(addonInterface);

module.exports = (req, res) => {
    router(req, res, () => { res.status(404).send('Not found'); });
};
