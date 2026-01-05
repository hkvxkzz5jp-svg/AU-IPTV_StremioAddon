const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const builder = new addonBuilder({
    id: 'com.au.sports.dynamic',
    version: '4.0.0',
    name: 'AU Sports Dynamic',
    resources: ['catalog', 'stream'],
    types: ['tv'],
    idPrefixes: ['ausports_'],
    catalogs: [{ type: 'tv', id: 'ausports_cat', name: 'AU Sports' }]
});

// We use the 'raw-tv.m3u8' instead of a JSON file to get the most stable links
const M3U_URL = 'https://i.mjh.nz/au/Sydney/raw-tv.m3u8';

async function getChannels() {
    const res = await fetch(M3U_URL);
    const text = await res.text();
    const lines = text.split('\n');
    const channels = [];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXTINF')) {
            const nameMatch = lines[i].match(/,(.*)$/);
            const logoMatch = lines[i].match(/tvg-logo="(.*?)"/);
            const url = lines[i+1];
            
            if (nameMatch && url && url.startsWith('http')) {
                const name = nameMatch[1].trim();
                // Only keep the Sports/Fox/Kayo channels
                if (name.toLowerCase().includes('sport') || name.toLowerCase().includes('fox') || name.toLowerCase().includes('kayo')) {
                    channels.push({
                        id: `ausports_${name.replace(/\s+/g, '_').toLowerCase()}`,
                        name: name,
                        url: url.trim(),
                        logo: logoMatch ? logoMatch[1] : ''
                    });
                }
            }
        }
    }
    return channels;
}

builder.defineCatalogHandler(async () => {
    const channels = await getChannels();
    return { metas: channels.map(ch => ({ id: ch.id, type: 'tv', name: ch.name, poster: ch.logo })) };
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

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    getRouter(builder.getInterface())(req, res, () => res.status(404).end());
};
