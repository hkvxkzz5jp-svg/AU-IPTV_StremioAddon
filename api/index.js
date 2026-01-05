const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const builder = new addonBuilder({
    id: 'com.au.full.list',
    version: '5.0.0',
    name: 'AU Full Channel List',
    description: 'Every Available AU Channel',
    resources: ['catalog', 'stream'],
    types: ['tv'],
    idPrefixes: ['auchannel_'],
    catalogs: [{ type: 'tv', id: 'au_all', name: 'AU All Channels' }]
});

// Sydney usually has the most robust list
const M3U_URL = 'https://i.mjh.nz/au/Sydney/raw-tv.m3u8';

async function getChannels() {
    try {
        const res = await fetch(M3U_URL);
        const text = await res.text();
        const lines = text.split('\n');
        const channels = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('#EXTINF')) {
                const nameMatch = lines[i].match(/,(.*)$/);
                const logoMatch = lines[i].match(/tvg-logo="(.*?)"/);
                const url = lines[i+1]?.trim();
                
                if (nameMatch && url && url.startsWith('http')) {
                    const name = nameMatch[1].trim();
                    // NO FILTER: This will show you EVERY channel Matt has available
                    channels.push({
                        id: `auchannel_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
                        name: name,
                        url: url,
                        logo: logoMatch ? logoMatch[1] : ''
                    });
                }
            }
        }
        return channels;
    } catch (e) { return []; }
}

builder.defineCatalogHandler(async () => {
    const channels = await getChannels();
    return { metas: channels.map(ch => ({ 
        id: ch.id, 
        type: 'tv', 
        name: ch.name, 
        poster: ch.logo, 
        posterShape: 'square' 
    })) };
});

builder.defineStreamHandler(async (args) => {
    const channels = await getChannels();
    const ch = channels.find(c => c.id === args.id);
    if (ch) {
        return {
            streams: [{
                title: 'Live Stream',
                url: ch.url,
                behaviorHints: { isLive: true, proxyHeaders: { "User-Agent": "Mozilla/5.0" } }
            }]
        };
    }
    return { streams: [] };
});

const router = getRouter(builder.getInterface());
module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    router(req, res, () => res.status(404).end());
};
