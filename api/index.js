const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const manifest = {
    id: 'com.joshargh.auiptv.custom',
    version: '1.0.0',
    name: 'AU IPTV (Sports Fixed)',
    description: 'Live AU Channels',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    idPrefixes: ['auiptv_'],
    catalogs: [
        { type: 'tv', id: 'auiptv_all', name: 'AU IPTV - All' },
        { type: 'tv', id: 'auiptv_sports', name: 'AU IPTV - Sports' }
    ]
};

const builder = new addonBuilder(manifest);

// We use a simple URL that is more stable for Vercel
const SOURCE_URL = 'https://i.mjh.nz/au/Brisbane/raw.json';

builder.defineCatalogHandler(async (args) => {
    try {
        const res = await fetch(SOURCE_URL);
        const data = await res.json();
        const channelData = data.channels || {};
        
        let channels = Object.keys(channelData).map(key => {
            const ch = channelData[key];
            return {
                id: `auiptv_${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                type: 'tv',
                name: ch.name || key,
                poster: ch.logo || '',
                background: ch.logo || '',
                description: ch.group || 'AU Live TV',
                group: ch.group || ''
            };
        });

        if (args.id === 'auiptv_sports') {
            channels = channels.filter(c => 
                c.group.toLowerCase().includes('sport') || 
                c.name.toLowerCase().includes('sport') ||
                c.name.toLowerCase().includes('kayo') ||
                c.name.toLowerCase().includes('fox') ||
                c.name.toLowerCase().includes('racing')
            );
        }

        return { metas: channels };
    } catch (e) {
        console.error(e);
        return { metas: [] };
    }
});

builder.defineMetaHandler(async (args) => {
    const res = await fetch(SOURCE_URL);
    const data = await res.json();
    const id = args.id.replace('auiptv_', '');
    const ch = data.channels[id] || Object.values(data.channels).find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === id);

    if (ch) {
        return {
            meta: {
                id: args.id,
                type: 'tv',
                name: ch.name,
                poster: ch.logo,
                description: `Watch ${ch.name} Live.`
            }
        };
    }
    return { meta: {} };
});

builder.defineStreamHandler(async (args) => {
    const res = await fetch(SOURCE_URL);
    const data = await res.json();
    const id = args.id.replace('auiptv_', '');
    const ch = data.channels[id] || Object.values(data.channels).find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === id);
    
    return { streams: ch ? [{ url: ch.url, title: 'Live Stream' }] : [] };
});

const addonInterface = builder.getInterface();
const router = getRouter(addonInterface);

module.exports = (req, res) => {
    router(req, res, () => { res.status(404).send('Not found'); });
};
