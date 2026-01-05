const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const builder = new addonBuilder({
    id: 'com.au.sports.dynamic.fixed',
    version: '4.5.0',
    name: 'AU Sports Live',
    description: 'Live Australian Sports Feeds',
    resources: ['catalog', 'stream'],
    types: ['tv'],
    idPrefixes: ['ausports_'],
    catalogs: [{ type: 'tv', id: 'ausports_cat', name: 'AU Sports' }]
});

// Using the Brisbane RAW file - very reliable for Australian Sports
const M3U_URL = 'https://i.mjh.nz/au/Brisbane/raw-tv.m3u8';

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
                    const nameLower = name.toLowerCase();
                    // Filter specifically for the "Big 3" sports keywords
                    if (nameLower.includes('sport') || nameLower.includes('fox') || nameLower.includes('kayo')) {
                        channels.push({
                            id: `ausports_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
                            name: name,
                            url: url,
                            logo: logoMatch ? logoMatch[1] : ''
                        });
                    }
                }
            }
        }
        return channels;
    } catch (e) {
        return [];
    }
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
    // These headers are the "secret sauce" for Omni/Stremio stability
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    router(req, res, () => res.status(404).end());
};
