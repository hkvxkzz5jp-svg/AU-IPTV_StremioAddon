const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

const builder = new addonBuilder({
    id: 'com.au.live.final.v10',
    version: '10.0.0',
    name: 'AU Live TV',
    resources: ['catalog', 'stream'],
    types: ['tv'],
    idPrefixes: ['au_'],
    catalogs: [{ type: 'tv', id: 'au_cat', name: 'AU Channels' }]
});

const M3U_URL = 'https://i.mjh.nz/au/Sydney/kodi-tv.m3u8';

async function getChannels() {
    try {
        const res = await fetch(M3U_URL);
        const text = await res.text();
        return text.split('\n').reduce((acc, line, i, arr) => {
            if (line.startsWith('#EXTINF')) {
                const name = line.match(/,(.*)$/)?.[1]?.trim();
                const url = arr[i+1]?.trim()?.split('|')[0];
                if (name && url) {
                    acc.push({ id: `au_${name.toLowerCase().replace(/[^a-z]/g, '')}`, name, url });
                }
            }
            return acc;
        }, []);
    } catch (e) { return []; }
}

builder.defineCatalogHandler(async () => {
    const channels = await getChannels();
    return { metas: channels.map(c => ({ id: c.id, type: 'tv', name: c.name })) };
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    router(req, res, () => res.status(404).send('Check vercel.json configuration'));
};
