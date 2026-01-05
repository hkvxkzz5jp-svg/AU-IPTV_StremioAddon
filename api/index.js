const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const builder = new addonBuilder({
    id: 'com.au.full.stable',
    version: '6.0.0',
    name: 'AU Stable Channels',
    resources: ['catalog', 'stream'],
    types: ['tv'],
    idPrefixes: ['auchannel_'],
    catalogs: [{ type: 'tv', id: 'au_all', name: 'AU All Channels' }]
});

const M3U_URL = 'https://i.mjh.nz/au/Sydney/raw-tv.m3u8';

// Global cache to ensure IDs match between catalog and stream requests
let channelCache = [];

async function refreshChannels() {
    try {
        const res = await fetch(M3U_URL);
        const text = await res.text();
        const lines = text.split('\n');
        const tempChannels = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('#EXTINF')) {
                const nameMatch = lines[i].match(/,(.*)$/);
                const logoMatch = lines[i].match(/tvg-logo="(.*?)"/);
                const url = lines[i+1]?.trim();
                
                if (nameMatch && url && url.startsWith('http')) {
                    const name = nameMatch[1].trim();
                    // Generate a clean ID once
                    const cleanId = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    tempChannels.push({
                        id: `auchannel_${cleanId}`,
                        name: name,
                        url: url,
                        logo: logoMatch ? logoMatch[1] : ''
                    });
                }
            }
        }
        channelCache = tempChannels;
        return channelCache;
    } catch (e) { return []; }
}

builder.defineCatalogHandler(async () => {
    const channels = await refreshChannels();
    return { metas: channels.map(ch => ({ 
        id: ch.id, 
        type: 'tv', 
        name: ch.name, 
        poster: ch.logo, 
        posterShape: 'square' 
    })) };
});

builder.defineStreamHandler(async (args) => {
    // If cache is empty, fill it
    if (channelCache.length === 0) await refreshChannels();
    
    const ch = channelCache.find(c => c.id === args.id);
    if (ch) {
        return {
            streams: [{
                title: 'Live Stream',
                url: ch.url,
                behaviorHints: { 
                    isLive: true,
                    proxyHeaders: { "User-Agent": "Mozilla/5.0" }
                }
            }]
        };
    }
    return { streams: [] };
});

const router = getRouter(builder.getInterface());
module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    router(req, res, () => res.status(404).end());
};
