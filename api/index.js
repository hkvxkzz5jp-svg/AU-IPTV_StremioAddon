const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const builder = new addonBuilder({
    id: 'com.au.final.omni.fix', // New ID to force Omni to re-read it
    version: '9.0.0',
    name: 'AU Sports & TV',
    resources: ['catalog', 'stream'],
    types: ['tv'],
    idPrefixes: ['auchannel_'],
    catalogs: [{ type: 'tv', id: 'au_all', name: 'AU Live TV' }]
});

const M3U_URL = 'https://i.mjh.nz/au/Sydney/kodi-tv.m3u8';

// This function makes sure the ID is the same every time
const cleanId = (name) => `auchannel_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

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
                const url = lines[i+1]?.trim()?.split('|')[0];
                if (name && url) {
                    channels.push({ id: cleanId(name), name, url, logo: logo || '' });
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
                    proxyHeaders: { "User-Agent": "Mozilla/5.0", "Referer": "https://i.mjh.nz/" } 
                }
            }]
        };
    }
    return { streams: [] };
});

const router = getRouter(builder.getInterface());
module.exports = (req, res) => {
    // These 3 lines are what Omni needs to "Accept" the addon
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') return res.status(204).end();
    router(req, res, () => res.status(404).end());
};
