const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const builder = new addonBuilder({
    id: 'com.au.sports.final.fixed',
    version: '8.0.0',
    name: 'AU Sports Final',
    resources: ['catalog', 'stream'],
    types: ['tv'],
    idPrefixes: ['auchannel_'],
    catalogs: [{ type: 'tv', id: 'au_all', name: 'AU Channels' }]
});

// We use the Kodi-specific list because it is designed for third-party players
const M3U_URL = 'https://i.mjh.nz/au/Sydney/kodi-tv.m3u8';

async function getChannels() {
    try {
        const res = await fetch(M3U_URL);
        const text = await res.text();
        const lines = text.split('\n');
        const channels = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('#EXTINF')) {
                const name = lines[i].match(/,(.*)$/)?.[1]?.trim();
                const logo = lines[i].match(/tvg-logo="(.*?)"/)?.[1];
                let url = lines[i+1]?.trim();
                
                if (name && url && url.startsWith('http')) {
                    // Extract just the URL if there's extra Kodi metadata
                    const cleanUrl = url.split('|')[0];
                    channels.push({
                        id: `auchannel_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                        name: name,
                        url: cleanUrl,
                        logo: logo || ''
                    });
                }
            }
        }
        return channels;
    } catch (e) { return []; }
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
                name: 'AU Live Feed',
                title: '720p/1080p (Requires Australian VPN)',
                url: ch.url,
                behaviorHints: {
                    isLive: true,
                    // These headers are mandatory for AU streams to bypass 403 errors
                    proxyHeaders: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Referer": "https://www.matthuisman.nz/"
                    }
                }
            }]
        };
    }
    return { streams: [] };
});

const router = getRouter(builder.getInterface());

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    router(req, res, () => res.status(404).end());
};
