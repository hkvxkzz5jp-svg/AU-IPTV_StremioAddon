const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const builder = new addonBuilder({
    id: 'com.au.sports.final.fixed',
    version: '7.0.0',
    name: 'AU Sports Final',
    resources: ['catalog', 'stream'],
    types: ['tv'],
    idPrefixes: ['auchannel_'],
    catalogs: [{ type: 'tv', id: 'au_all', name: 'AU Channels' }]
});

// We switch to the KODI-formatted list which is often more compatible
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
                    // Matt Huisman's Kodi links often have pipe | headers in them
                    // We need to split those out for Stremio
                    const urlParts = url.split('|');
                    const cleanUrl = urlParts[0];

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
                title: 'Live Stream',
                url: ch.url,
                behaviorHints: {
                    isLive: true,
                    // THESE HEADERS ARE THE FIX
                    proxyHeaders: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
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
    router(req, res, () => res.status(404).end());
};
