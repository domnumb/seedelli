#!/usr/bin/env node
// Kokopelli full catalog scraper
// Uses curl for HTTP to avoid node version issues
// Target: https://kokopelli-semences.com (68 pages, ~2429 products)

const https = require('https');
const fs = require('fs');

const OUTPUT_FILE = '/Users/mael/projects/seedelli/catalogs/kokopelli-full.json';
const EXISTING_FILE = '/Users/mael/projects/seedelli/catalogs/kokopelli.json';
const BASE_URL = 'https://kokopelli-semences.com';
const DELAY_MS = 600;
const SAVE_EVERY = 50;
const CONCURRENT = 4; // parallel requests
const TOTAL_PAGES = 68;

// Load existing varieties for dedup check
const existingRaw = fs.readFileSync(EXISTING_FILE, 'utf8');
const existingVarieties = JSON.parse(existingRaw);
const existingNames = new Set(existingVarieties.map(v => normalizeNameForDedup(v.name)));

function normalizeNameForDedup(name) {
  return name.toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
        }
      }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          if (loc) {
            const redirectUrl = loc.startsWith('http') ? loc : BASE_URL + loc;
            attempt(n); // try same URL with redirect
            return;
          }
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else if ((res.statusCode === 429 || res.statusCode === 503) && n > 0) {
            setTimeout(() => attempt(n - 1), 3000);
          } else if (res.statusCode === 404) {
            resolve(''); // Skip 404s
          } else {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          }
        });
      });
      req.on('error', (err) => {
        if (n > 0) setTimeout(() => attempt(n - 1), 2000);
        else reject(err);
      });
      req.setTimeout(20000, () => {
        req.destroy();
        if (n > 0) setTimeout(() => attempt(n - 1), 2000);
        else reject(new Error(`Timeout for ${url}`));
      });
    };
    attempt(retries);
  });
}

// Parse listing page to get unique product URLs
function parseListingPage(html) {
  const urls = new Set();
  const re = /\/en\/p\/([a-z0-9][a-z0-9-]*[a-z0-9])/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    // Filter out non-product paths
    const path = m[0];
    if (!path.includes('search') && !path.includes('login') && !path.includes('cart')) {
      urls.add(BASE_URL + path);
    }
  }
  return Array.from(urls);
}

// Extract French product URL from hreflang tag
function extractFrenchUrl(html) {
  const m = html.match(/<link[^>]+hreflang=["']fr["'][^>]+href=["']([^"']+)["']/i)
           || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+hreflang=["']fr["']/i);
  if (m) return m[1];
  // Fallback: look for /fr/p/ links in the HTML
  const fp = html.match(/href=["'](https?:\/\/[^"']*\/fr\/p\/[a-z0-9][a-z0-9-]*[a-z0-9])["']/i);
  if (fp) return fp[1];
  return null;
}

// Convert month names to numbers
const MONTH_MAP = {
  'january': 1, 'february': 2, 'march': 3, 'april': 4,
  'may': 5, 'june': 6, 'july': 7, 'august': 8,
  'september': 9, 'october': 10, 'november': 11, 'december': 12
};

function parseMonths(text) {
  if (!text) return [];
  return text.toLowerCase().split(/[,\s]+/)
    .map(w => MONTH_MAP[w.trim()])
    .filter(n => n !== undefined);
}

// Map sun exposure
function mapSunNeed(text) {
  if (!text) return 'plein soleil';
  const t = text.toLowerCase();
  if (t.includes('shade') && t.includes('sun')) return 'mi-ombre';
  if (t.includes('shade') || t.includes('semi')) return 'mi-ombre';
  if (t.includes('full sun') || t.includes('sunny')) return 'plein soleil';
  if (t.includes('shade')) return 'ombre';
  return 'plein soleil';
}

// Map water need
function mapWaterNeed(text) {
  if (!text) return 'modéré';
  const t = text.toLowerCase();
  if (t.includes('low') || t.includes('faible') || t.includes('little')) return 'faible';
  if (t.includes('high') || t.includes('élevé') || t.includes('important') || t.includes('lot')) return 'élevé';
  return 'modéré';
}

// Category mapping from JSON-LD category string
function mapCategoryFromJsonLd(categoryStr, productUrl) {
  const cat = (categoryStr || '').toLowerCase();
  const url = (productUrl || '').toLowerCase();

  // Try URL-based detection first (most reliable)
  if (url.includes('cherry-tomato') || url.includes('-tomato')) {
    return { category: 'legumes-fruits', subcategory: 'tomates' };
  }
  if (url.includes('sweet-bell-pepper') || url.includes('bell-pepper')) {
    return { category: 'legumes-fruits', subcategory: 'poivrons' };
  }
  if (url.includes('-pepper')) {
    // Check if sweet bell pepper
    if (cat.includes('sweet bell')) return { category: 'legumes-fruits', subcategory: 'poivrons' };
    return { category: 'legumes-fruits', subcategory: 'piments' };
  }
  if (url.includes('eggplant')) {
    return { category: 'legumes-fruits', subcategory: 'aubergines' };
  }
  if (url.includes('zucchini') || url.includes('maxima-squash') || url.includes('squash') || url.includes('pumpkin')) {
    return { category: 'legumes-fruits', subcategory: 'courges' };
  }
  if (url.includes('gourd')) {
    return { category: 'legumes-fruits', subcategory: 'courges' };
  }
  if (url.includes('cucumber') || url.includes('gherkin')) {
    return { category: 'legumes-fruits', subcategory: 'concombres' };
  }
  if (url.includes('watermelon')) {
    return { category: 'legumes-fruits', subcategory: 'melons' };
  }
  if (url.includes('-melon')) {
    return { category: 'legumes-fruits', subcategory: 'melons' };
  }
  if (url.includes('-bean') && url.includes('broad')) {
    return { category: 'legumes-grains', subcategory: 'feves' };
  }
  if (url.includes('-bean') || url.includes('soya-bean') || url.includes('soy-bean')) {
    if (url.includes('soya') || url.includes('soy-bean')) return { category: 'legumes-grains', subcategory: 'soja' };
    return { category: 'legumes-grains', subcategory: 'haricots' };
  }
  if (url.includes('sweet-pea') && !url.includes('green')) {
    return { category: 'fleurs', subcategory: 'pois-de-senteur' };
  }
  if (url.includes('-pea') || url.includes('pea-')) {
    return { category: 'legumes-grains', subcategory: 'pois' };
  }
  if (url.includes('corn') || url.includes('maize')) {
    return { category: 'legumes-grains', subcategory: 'mais' };
  }
  if (url.includes('quinoa')) {
    return { category: 'legumes-grains', subcategory: 'cereales' };
  }
  if (url.includes('wheat') || url.includes('barley') || url.includes('oat') || url.includes('rye') || url.includes('sorghum')) {
    return { category: 'legumes-grains', subcategory: 'cereales' };
  }
  if (url.includes('-carrot')) {
    return { category: 'legumes-racines', subcategory: 'carottes' };
  }
  if (url.includes('-beet') || url.includes('beet-')) {
    return { category: 'legumes-racines', subcategory: 'betteraves' };
  }
  if (url.includes('-radish') || url.includes('radish-')) {
    return { category: 'legumes-racines', subcategory: 'radis' };
  }
  if (url.includes('-turnip') || url.includes('turnip-')) {
    return { category: 'legumes-racines', subcategory: 'navets' };
  }
  if (url.includes('parsnip')) {
    return { category: 'legumes-racines', subcategory: 'panais' };
  }
  if (url.includes('celeriac')) {
    return { category: 'legumes-racines', subcategory: 'celeri' };
  }
  if (url.includes('salsify') || url.includes('scorzonera')) {
    return { category: 'legumes-racines', subcategory: 'salsifis' };
  }
  if (url.includes('-lettuce') || url.includes('lettuce-')) {
    return { category: 'legumes-feuilles', subcategory: 'laitues' };
  }
  if (url.includes('-spinach') || url.includes('spinach-')) {
    return { category: 'legumes-feuilles', subcategory: 'epinards' };
  }
  if (url.includes('-chard') || url.includes('chard-')) {
    return { category: 'legumes-feuilles', subcategory: 'blettes' };
  }
  if (url.includes('-cabbage') || url.includes('cabbage-') || url.includes('-kale') || url.includes('broccoli') || url.includes('cauliflower') || url.includes('brussels')) {
    return { category: 'legumes-feuilles', subcategory: 'choux' };
  }
  if (url.includes('-celery') || url.includes('celery-')) {
    return { category: 'legumes-feuilles', subcategory: 'celeri' };
  }
  if (url.includes('-leek') || url.includes('leek-')) {
    return { category: 'legumes-feuilles', subcategory: 'poireaux' };
  }
  if (url.includes('-onion') || url.includes('onion-') || url.includes('shallot')) {
    return { category: 'legumes-feuilles', subcategory: 'oignons' };
  }
  if (url.includes('garlic')) {
    return { category: 'legumes-feuilles', subcategory: 'ail' };
  }
  if (url.includes('artichoke')) {
    return { category: 'legumes-feuilles', subcategory: 'artichauts' };
  }
  if (url.includes('asparagus')) {
    return { category: 'legumes-feuilles', subcategory: 'asperges' };
  }
  if (url.includes('-fennel') || url.includes('fennel-')) {
    return { category: 'legumes-feuilles', subcategory: 'fenouil' };
  }
  if (url.includes('-okra') || url.includes('okra-')) {
    return { category: 'legumes-feuilles', subcategory: 'okra' };
  }
  if (url.includes('miner-s-lettuce') || url.includes('mache') || url.includes('claytonia')) {
    return { category: 'legumes-feuilles', subcategory: 'salades' };
  }
  if (url.includes('arugula') || url.includes('rocket')) {
    return { category: 'legumes-feuilles', subcategory: 'salades' };
  }
  if (url.includes('endive') || url.includes('chicory')) {
    return { category: 'legumes-feuilles', subcategory: 'salades' };
  }
  if (url.includes('amaranth')) {
    return { category: 'legumes-feuilles', subcategory: 'divers' };
  }

  // Aromatics
  if (url.includes('-basil') || url.includes('basil-')) {
    return { category: 'aromatiques', subcategory: 'basilic' };
  }
  if (url.includes('-thyme') || url.includes('thyme-')) {
    return { category: 'aromatiques', subcategory: 'thym' };
  }
  if (url.includes('-sage') || url.includes('sage-') || url.includes('salvia')) {
    // Could be medicinal or aromatic
    if (cat.includes('medicinal') || cat.includes('Medicinal')) {
      return { category: 'medicinales', subcategory: 'sauge' };
    }
    return { category: 'aromatiques', subcategory: 'sauge' };
  }
  if (url.includes('oregano')) {
    return { category: 'aromatiques', subcategory: 'origan' };
  }
  if (url.includes('parsley')) {
    return { category: 'aromatiques', subcategory: 'persil' };
  }
  if (url.includes('coriander') || url.includes('cilantro')) {
    return { category: 'aromatiques', subcategory: 'coriandre' };
  }
  if (url.includes('-dill') || url.includes('dill-')) {
    return { category: 'aromatiques', subcategory: 'aneth' };
  }
  if (url.includes('chive')) {
    return { category: 'aromatiques', subcategory: 'ciboulette' };
  }
  if (url.includes('-mint') || url.includes('mint-') || url.includes('mentha')) {
    return { category: 'aromatiques', subcategory: 'menthe' };
  }
  if (url.includes('rosemary')) {
    return { category: 'aromatiques', subcategory: 'romarin' };
  }
  if (url.includes('lavender') || url.includes('lavandula')) {
    return { category: 'aromatiques', subcategory: 'lavande' };
  }
  if (url.includes('hyssop') || url.includes('hysop')) {
    return { category: 'aromatiques', subcategory: 'hysope' };
  }
  if (url.includes('agastache') || url.includes('agastach')) {
    return { category: 'aromatiques', subcategory: 'agastache' };
  }
  if (url.includes('lemon-balm') || url.includes('melissa')) {
    return { category: 'aromatiques', subcategory: 'melissa' };
  }
  if (url.includes('stevia')) {
    return { category: 'aromatiques', subcategory: 'stevia' };
  }
  if (url.includes('savory') || url.includes('sarriette')) {
    return { category: 'aromatiques', subcategory: 'sarriette' };
  }
  if (url.includes('tarragon')) {
    return { category: 'aromatiques', subcategory: 'estragon' };
  }
  if (url.includes('marjoram') || url.includes('majoram')) {
    return { category: 'aromatiques', subcategory: 'marjolaine' };
  }
  if (url.includes('anise') || url.includes('anis')) {
    return { category: 'aromatiques', subcategory: 'anis' };
  }
  if (url.includes('caraway') || url.includes('cumin') || url.includes('fenugreek')) {
    return { category: 'aromatiques', subcategory: 'epices' };
  }

  // Flowers
  if (url.includes('-poppy') || url.includes('poppy-')) {
    return { category: 'fleurs', subcategory: 'coquelicots' };
  }
  if (url.includes('california-poppy') || url.includes('eschscholtz')) {
    return { category: 'fleurs', subcategory: 'eschscholtzia' };
  }
  if (url.includes('cosmo') || url.includes('cosmos')) {
    return { category: 'fleurs', subcategory: 'cosmos' };
  }
  if (url.includes('sunflower')) {
    return { category: 'fleurs', subcategory: 'tournesols' };
  }
  if (url.includes('marigold')) {
    return { category: 'fleurs', subcategory: 'tagetes' };
  }
  if (url.includes('sweet-pea')) {
    return { category: 'fleurs', subcategory: 'pois-de-senteur' };
  }
  if (url.includes('zinnia')) {
    return { category: 'fleurs', subcategory: 'zinnias' };
  }
  if (url.includes('nasturtium')) {
    return { category: 'fleurs', subcategory: 'capucines' };
  }
  if (url.includes('calendula')) {
    return { category: 'fleurs', subcategory: 'calendulas' };
  }
  if (url.includes('cornflower') || url.includes('centaurea')) {
    return { category: 'fleurs', subcategory: 'bleuets' };
  }
  if (url.includes('-dahlia') || url.includes('dahlia-')) {
    return { category: 'fleurs', subcategory: 'dahlias' };
  }
  if (url.includes('hollyhock') || url.includes('alcea')) {
    return { category: 'fleurs', subcategory: 'roses-tremiere' };
  }
  if (url.includes('african-daisy') || url.includes('arctotis')) {
    return { category: 'fleurs', subcategory: 'marguerites' };
  }
  if (url.includes('nigella') || url.includes('love-in-a-mist')) {
    return { category: 'fleurs', subcategory: 'nigelles' };
  }
  if (url.includes('phacelia')) {
    // Could be green manure or flower
    if (cat.includes('green manure')) return { category: 'engrais-verts', subcategory: 'engrais-verts' };
    return { category: 'fleurs', subcategory: 'phacelies' };
  }
  if (url.includes('borage')) {
    return { category: 'fleurs', subcategory: 'bourrache' };
  }

  // Medicinal
  if (url.includes('artemisia')) {
    return { category: 'medicinales', subcategory: 'artemisia' };
  }
  if (url.includes('withania') || url.includes('ashwagandha')) {
    return { category: 'medicinales', subcategory: 'ashwagandha' };
  }
  if (url.includes('echinacea')) {
    return { category: 'medicinales', subcategory: 'echinacea' };
  }
  if (url.includes('valerian')) {
    return { category: 'medicinales', subcategory: 'valeriane' };
  }
  if (url.includes('st-john') || url.includes('hypericum')) {
    return { category: 'medicinales', subcategory: 'millepertuis' };
  }
  if (url.includes('andrographis')) {
    return { category: 'medicinales', subcategory: 'divers' };
  }
  if (url.includes('ashitaba') || url.includes('angelica')) {
    return { category: 'medicinales', subcategory: 'divers' };
  }

  // Green manures
  if (url.includes('alfalfa') || url.includes('clover') || url.includes('buckwheat') || url.includes('phacelia') || url.includes('vetch') || url.includes('lupine') || url.includes('lupin')) {
    return { category: 'engrais-verts', subcategory: 'engrais-verts' };
  }

  // Fall back to JSON-LD category
  if (cat.includes('cherry tomato')) return { category: 'legumes-fruits', subcategory: 'tomates' };
  if (cat.includes('tomato')) return { category: 'legumes-fruits', subcategory: 'tomates' };
  if (cat.includes('pepper')) {
    if (cat.includes('sweet bell')) return { category: 'legumes-fruits', subcategory: 'poivrons' };
    return { category: 'legumes-fruits', subcategory: 'piments' };
  }
  if (cat.includes('eggplant')) return { category: 'legumes-fruits', subcategory: 'aubergines' };
  if (cat.includes('zucchini') || cat.includes('squash') || cat.includes('pumpkin')) return { category: 'legumes-fruits', subcategory: 'courges' };
  if (cat.includes('cucumber') || cat.includes('gherkin')) return { category: 'legumes-fruits', subcategory: 'concombres' };
  if (cat.includes('melon') || cat.includes('watermelon')) return { category: 'legumes-fruits', subcategory: 'melons' };
  if (cat.includes('bean')) return { category: 'legumes-grains', subcategory: 'haricots' };
  if (cat.includes('pea')) return { category: 'legumes-grains', subcategory: 'pois' };
  if (cat.includes('lettuce')) return { category: 'legumes-feuilles', subcategory: 'laitues' };
  if (cat.includes('spinach')) return { category: 'legumes-feuilles', subcategory: 'epinards' };
  if (cat.includes('carrot')) return { category: 'legumes-racines', subcategory: 'carottes' };
  if (cat.includes('beet')) return { category: 'legumes-racines', subcategory: 'betteraves' };
  if (cat.includes('radish')) return { category: 'legumes-racines', subcategory: 'radis' };
  if (cat.includes('cabbage') || cat.includes('kale') || cat.includes('broccoli')) return { category: 'legumes-feuilles', subcategory: 'choux' };
  if (cat.includes('basil')) return { category: 'aromatiques', subcategory: 'basilic' };
  if (cat.includes('aromatic') || cat.includes('herb')) return { category: 'aromatiques', subcategory: 'divers' };
  if (cat.includes('medicinal')) return { category: 'medicinales', subcategory: 'divers' };
  if (cat.includes('flower') || cat.includes('floral')) return { category: 'fleurs', subcategory: 'divers' };
  if (cat.includes('green manure')) return { category: 'engrais-verts', subcategory: 'engrais-verts' };
  if (cat.includes('vegetable')) return { category: 'legumes-feuilles', subcategory: 'divers' };

  return { category: 'legumes-feuilles', subcategory: 'divers' };
}

// Get defaults based on category/subcategory
function getDefaults(category, subcategory) {
  const sub = subcategory || '';
  const cat = category || '';

  if (sub === 'tomates' || sub === 'aubergines') {
    return {
      altitude_max: 800, cold_tolerance: 'faible', heat_preference: 'forte',
      difficulty: 3, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 0.5,
      sowing_indoor: [2,3,4], sowing_outdoor: [], transplant: [5,6], harvest: [7,8,9,10],
      beginner_friendly: false, medicinal: false, pollinator_friendly: false, kids_friendly: false
    };
  }
  if (sub === 'poivrons' || sub === 'piments') {
    return {
      altitude_max: 800, cold_tolerance: 'faible', heat_preference: 'forte',
      difficulty: 3, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 0.5,
      sowing_indoor: [2,3,4], sowing_outdoor: [], transplant: [5,6], harvest: [7,8,9,10],
      beginner_friendly: false, medicinal: false, pollinator_friendly: false, kids_friendly: false
    };
  }
  if (sub === 'courges' || sub === 'courgettes') {
    return {
      altitude_max: 900, cold_tolerance: 'faible', heat_preference: 'forte',
      difficulty: 2, sun_need: 'plein soleil', water_need: 'élevé', space_m2: 2,
      sowing_indoor: [4,5], sowing_outdoor: [5,6], transplant: [6], harvest: [8,9,10],
      beginner_friendly: true, medicinal: false, pollinator_friendly: true, kids_friendly: true
    };
  }
  if (sub === 'concombres') {
    return {
      altitude_max: 900, cold_tolerance: 'faible', heat_preference: 'forte',
      difficulty: 2, sun_need: 'plein soleil', water_need: 'élevé', space_m2: 1,
      sowing_indoor: [4,5], sowing_outdoor: [5,6], transplant: [6], harvest: [7,8,9],
      beginner_friendly: true, medicinal: false, pollinator_friendly: false, kids_friendly: true
    };
  }
  if (sub === 'melons') {
    return {
      altitude_max: 600, cold_tolerance: 'faible', heat_preference: 'forte',
      difficulty: 3, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 2,
      sowing_indoor: [4,5], sowing_outdoor: [5,6], transplant: [6], harvest: [8,9],
      beginner_friendly: false, medicinal: false, pollinator_friendly: true, kids_friendly: true
    };
  }
  if (sub === 'carottes') {
    return {
      altitude_max: 1500, cold_tolerance: 'forte', heat_preference: 'faible',
      difficulty: 2, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 0.1,
      sowing_indoor: [], sowing_outdoor: [3,4,5,6], transplant: [], harvest: [7,8,9,10],
      beginner_friendly: true, medicinal: false, pollinator_friendly: false, kids_friendly: true
    };
  }
  if (sub === 'betteraves') {
    return {
      altitude_max: 1500, cold_tolerance: 'moyenne', heat_preference: 'moyenne',
      difficulty: 1, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 0.1,
      sowing_indoor: [2,3], sowing_outdoor: [4,5,6], transplant: [4,5], harvest: [6,7,8,9,10,11],
      beginner_friendly: true, medicinal: false, pollinator_friendly: false, kids_friendly: true
    };
  }
  if (sub === 'radis' || sub === 'navets' || sub === 'panais') {
    return {
      altitude_max: 1500, cold_tolerance: 'forte', heat_preference: 'faible',
      difficulty: 1, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 0.05,
      sowing_indoor: [], sowing_outdoor: [3,4,5,6,7,8], transplant: [], harvest: [5,6,7,8,9,10],
      beginner_friendly: true, medicinal: false, pollinator_friendly: false, kids_friendly: true
    };
  }
  if (sub === 'laitues' || sub === 'salades') {
    return {
      altitude_max: 1800, cold_tolerance: 'forte', heat_preference: 'faible',
      difficulty: 1, sun_need: 'mi-ombre', water_need: 'modéré', space_m2: 0.1,
      sowing_indoor: [2,3], sowing_outdoor: [3,4,5,8,9], transplant: [4,5], harvest: [5,6,7,8,9,10],
      beginner_friendly: true, medicinal: false, pollinator_friendly: false, kids_friendly: true
    };
  }
  if (sub === 'epinards' || sub === 'blettes') {
    return {
      altitude_max: 1800, cold_tolerance: 'forte', heat_preference: 'faible',
      difficulty: 1, sun_need: 'mi-ombre', water_need: 'modéré', space_m2: 0.1,
      sowing_indoor: [], sowing_outdoor: [3,4,5,8,9], transplant: [], harvest: [5,6,7,8,9,10],
      beginner_friendly: true, medicinal: false, pollinator_friendly: false, kids_friendly: true
    };
  }
  if (sub === 'choux') {
    return {
      altitude_max: 1500, cold_tolerance: 'forte', heat_preference: 'faible',
      difficulty: 2, sun_need: 'plein soleil', water_need: 'élevé', space_m2: 0.5,
      sowing_indoor: [3,4,5], sowing_outdoor: [5,6], transplant: [5,6,7], harvest: [9,10,11,12],
      beginner_friendly: true, medicinal: false, pollinator_friendly: false, kids_friendly: false
    };
  }
  if (sub === 'poireaux' || sub === 'oignons' || sub === 'ail') {
    return {
      altitude_max: 1500, cold_tolerance: 'forte', heat_preference: 'faible',
      difficulty: 2, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 0.1,
      sowing_indoor: [2,3], sowing_outdoor: [3,4], transplant: [5,6], harvest: [8,9,10,11],
      beginner_friendly: true, medicinal: false, pollinator_friendly: false, kids_friendly: false
    };
  }
  if (sub === 'fenouil' || sub === 'celeri' || sub === 'artichauts' || sub === 'asperges') {
    return {
      altitude_max: 1200, cold_tolerance: 'moyenne', heat_preference: 'moyenne',
      difficulty: 3, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 0.25,
      sowing_indoor: [3,4], sowing_outdoor: [4,5], transplant: [5,6], harvest: [8,9,10],
      beginner_friendly: false, medicinal: false, pollinator_friendly: false, kids_friendly: false
    };
  }
  if (sub === 'okra') {
    return {
      altitude_max: 600, cold_tolerance: 'faible', heat_preference: 'forte',
      difficulty: 3, sun_need: 'plein soleil', water_need: 'élevé', space_m2: 0.5,
      sowing_indoor: [4,5], sowing_outdoor: [5,6], transplant: [6], harvest: [8,9,10],
      beginner_friendly: false, medicinal: false, pollinator_friendly: true, kids_friendly: false
    };
  }
  if (sub === 'haricots') {
    return {
      altitude_max: 1200, cold_tolerance: 'faible', heat_preference: 'moyenne',
      difficulty: 1, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 0.25,
      sowing_indoor: [], sowing_outdoor: [5,6], transplant: [], harvest: [7,8,9],
      beginner_friendly: true, medicinal: false, pollinator_friendly: true, kids_friendly: true
    };
  }
  if (sub === 'pois') {
    return {
      altitude_max: 1200, cold_tolerance: 'forte', heat_preference: 'faible',
      difficulty: 1, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 0.1,
      sowing_indoor: [], sowing_outdoor: [3,4,5], transplant: [], harvest: [6,7,8],
      beginner_friendly: true, medicinal: false, pollinator_friendly: true, kids_friendly: true
    };
  }
  if (sub === 'feves') {
    return {
      altitude_max: 1200, cold_tolerance: 'forte', heat_preference: 'faible',
      difficulty: 1, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 0.1,
      sowing_indoor: [], sowing_outdoor: [10,11,2,3], transplant: [], harvest: [5,6,7],
      beginner_friendly: true, medicinal: false, pollinator_friendly: true, kids_friendly: true
    };
  }
  if (sub === 'mais' || sub === 'soja' || sub === 'cereales') {
    return {
      altitude_max: 1000, cold_tolerance: 'faible', heat_preference: 'forte',
      difficulty: 2, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 0.25,
      sowing_indoor: [], sowing_outdoor: [5,6], transplant: [], harvest: [8,9,10],
      beginner_friendly: true, medicinal: false, pollinator_friendly: false, kids_friendly: true
    };
  }
  if (cat === 'aromatiques') {
    return {
      altitude_max: 1000, cold_tolerance: 'moyenne', heat_preference: 'forte',
      difficulty: 2, sun_need: 'plein soleil', water_need: 'faible', space_m2: 0.1,
      sowing_indoor: [3,4], sowing_outdoor: [4,5], transplant: [5,6], harvest: [6,7,8,9],
      beginner_friendly: true, medicinal: true, pollinator_friendly: true, kids_friendly: true
    };
  }
  if (cat === 'fleurs') {
    return {
      altitude_max: 1200, cold_tolerance: 'moyenne', heat_preference: 'moyenne',
      difficulty: 1, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 0.25,
      sowing_indoor: [3,4], sowing_outdoor: [4,5], transplant: [5,6], harvest: [6,7,8,9,10],
      beginner_friendly: true, medicinal: false, pollinator_friendly: true, kids_friendly: true
    };
  }
  if (cat === 'medicinales') {
    return {
      altitude_max: 1000, cold_tolerance: 'moyenne', heat_preference: 'moyenne',
      difficulty: 2, sun_need: 'plein soleil', water_need: 'faible', space_m2: 0.25,
      sowing_indoor: [3,4], sowing_outdoor: [4,5], transplant: [5,6], harvest: [7,8,9],
      beginner_friendly: false, medicinal: true, pollinator_friendly: true, kids_friendly: false
    };
  }
  if (cat === 'engrais-verts') {
    return {
      altitude_max: 1500, cold_tolerance: 'forte', heat_preference: 'faible',
      difficulty: 1, sun_need: 'plein soleil', water_need: 'faible', space_m2: 0.05,
      sowing_indoor: [], sowing_outdoor: [3,4,5,9,10], transplant: [], harvest: [],
      beginner_friendly: true, medicinal: false, pollinator_friendly: true, kids_friendly: false
    };
  }

  // Default
  return {
    altitude_max: 1200, cold_tolerance: 'moyenne', heat_preference: 'moyenne',
    difficulty: 2, sun_need: 'plein soleil', water_need: 'modéré', space_m2: 0.25,
    sowing_indoor: [3,4], sowing_outdoor: [4,5], transplant: [5,6], harvest: [7,8,9],
    beginner_friendly: true, medicinal: false, pollinator_friendly: false, kids_friendly: false
  };
}

function generateSlug(name, subcategory) {
  const prefixes = {
    'tomates': 'TOM', 'poivrons': 'POI', 'piments': 'PIM', 'aubergines': 'AUB',
    'courges': 'COU', 'courgettes': 'COU', 'concombres': 'CON', 'melons': 'MEL',
    'haricots': 'HAR', 'pois': 'PIS', 'feves': 'FEV', 'mais': 'MAI',
    'cereales': 'CER', 'soja': 'SOJ', 'carottes': 'CAR', 'betteraves': 'BET',
    'radis': 'RAD', 'navets': 'NAV', 'panais': 'PAN', 'laitues': 'LAI',
    'salades': 'SAL', 'epinards': 'EPI', 'blettes': 'BLE', 'choux': 'CHO',
    'poireaux': 'POR', 'oignons': 'OIG', 'ail': 'AIL', 'fenouil': 'FEN',
    'celeri': 'CEL', 'artichauts': 'ART', 'asperges': 'ASP', 'okra': 'OKR',
    'basilic': 'BAS', 'thym': 'THY', 'sauge': 'SAU', 'origan': 'ORI',
    'persil': 'PER', 'coriandre': 'COR', 'aneth': 'ANE', 'ciboulette': 'CIB',
    'menthe': 'MEN', 'romarin': 'ROM', 'lavande': 'LAV', 'agastache': 'AGA',
    'coquelicots': 'COQ', 'cosmos': 'COS', 'tournesols': 'TOU', 'tagetes': 'TAG',
    'pois-de-senteur': 'PDV', 'zinnias': 'ZIN', 'capucines': 'CAP',
    'calendulas': 'CAL', 'dahlias': 'DAH', 'medicinales': 'MED',
    'engrais-verts': 'ENG',
  };

  const prefix = prefixes[subcategory] || 'VAR';
  const nameSlug = name.toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[ç]/g, 'c').replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    .substring(0, 40);

  return `${prefix}-${nameSlug}`;
}

// Parse product page HTML using JSON-LD + period fields
function parseProductPage(html, productUrl) {
  if (!html || html.length < 1000) return null;

  // Extract JSON-LD data (most reliable)
  let jsonLdProduct = null;
  const jsonLdBlocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || [];
  for (const block of jsonLdBlocks) {
    try {
      const jsonStr = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
      const data = JSON.parse(jsonStr);
      if (data['@type'] === 'Product') {
        jsonLdProduct = data;
      }
    } catch(e) {}
  }

  let name = '';
  let latin = '';
  let desc = '';
  let price = 3.40;
  let categoryStr = '';

  if (jsonLdProduct) {
    name = jsonLdProduct.name || '';
    latin = (jsonLdProduct.alternateName || '').trim();
    desc = (jsonLdProduct.description || '').substring(0, 250).trim();
    price = jsonLdProduct.offers?.price || 3.40;
    categoryStr = jsonLdProduct.category || '';
  }

  // Fallback: extract name from h1
  if (!name) {
    const h1 = html.match(/<h1[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1) name = h1[1].replace(/<[^>]+>/g, '').trim();
  }

  // Fallback: extract latin from nom_latin field
  if (!latin) {
    const latinMatch = html.match(/id="nom_latin"[^>]*>\s*([\s\S]*?)<\/p>/);
    if (latinMatch) latin = latinMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  if (!name || name.length < 2) return null;

  // Extract calendar periods from HTML
  const sowIndoorMatch = html.match(/id="periode_semis_abri"[^>]*>([\s\S]*?)<\/p>/);
  const sowOutdoorMatch = html.match(/id="periode_semis_terre"[^>]*>([\s\S]*?)<\/p>/);
  const harvestMatch = html.match(/id="periode_recolte"[^>]*>([\s\S]*?)<\/p>/);

  const sowIndoorText = sowIndoorMatch ? sowIndoorMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  const sowOutdoorText = sowOutdoorMatch ? sowOutdoorMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  const harvestText = harvestMatch ? harvestMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // Extract sun/water from page
  const sunMatch = html.match(/id="exposition_espece"[^>]*>([\s\S]*?)<\/p>/);
  const waterMatch = html.match(/id="besoin_eau_espece"[^>]*>([\s\S]*?)<\/p>/);
  const sunText = sunMatch ? sunMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  const waterText = waterMatch ? waterMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // Determine category
  const { category, subcategory } = mapCategoryFromJsonLd(categoryStr, productUrl);
  const defaults = getDefaults(category, subcategory);

  // Parse months from page (override defaults if available)
  const sowing_indoor = sowIndoorText ? parseMonths(sowIndoorText) : defaults.sowing_indoor;
  const sowing_outdoor = sowOutdoorText ? parseMonths(sowOutdoorText) : defaults.sowing_outdoor;
  const harvest = harvestText ? parseMonths(harvestText) : defaults.harvest;

  // Determine transplant from context
  // For indoor-sown varieties, transplant is ~2 months after sowing_indoor last month
  let transplant = defaults.transplant;
  if (sowing_indoor.length > 0 && transplant.length === 0) {
    const lastIndoor = Math.max(...sowing_indoor);
    const tMonth = lastIndoor + 2;
    transplant = tMonth <= 12 ? [tMonth, tMonth + 1].filter(m => m <= 12) : [5, 6];
  }

  const sun_need = sunText ? mapSunNeed(sunText) : defaults.sun_need;
  const water_need = waterText ? mapWaterNeed(waterText) : defaults.water_need;

  // Special flags
  const isMedicinal = category === 'medicinales' || categoryStr.toLowerCase().includes('medicinal');
  const isAromatic = category === 'aromatiques';
  const isFlower = category === 'fleurs';
  const isTomato = subcategory === 'tomates';

  const slug = generateSlug(name, subcategory);

  // Try to get the French product URL from hreflang
  const frenchUrl = extractFrenchUrl(html);
  const productPageUrl = frenchUrl || productUrl;

  return {
    id: slug,
    name: name,
    latin: latin || '',
    category: category,
    subcategory: subcategory,
    kokopelli_url: `https://kokopelli-semences.fr/fr/c/search?search=${encodeURIComponent(name)}`,
    product_url: productPageUrl,
    price: typeof price === 'number' ? price : parseFloat(String(price)) || 3.40,
    difficulty: defaults.difficulty,
    desc: desc,
    altitude_max: defaults.altitude_max,
    cold_tolerance: defaults.cold_tolerance,
    heat_preference: defaults.heat_preference,
    sun_need: sun_need,
    water_need: water_need,
    space_m2: defaults.space_m2,
    sowing_indoor: sowing_indoor,
    sowing_outdoor: sowing_outdoor,
    transplant: transplant,
    harvest: harvest,
    companions: [],
    avoid_near: [],
    yield_desc: '',
    tags: [],
    beginner_friendly: defaults.beginner_friendly,
    medicinal: isMedicinal,
    pollinator_friendly: defaults.pollinator_friendly || isAromatic || isFlower,
    kids_friendly: defaults.kids_friendly || isTomato
  };
}

// Run tasks with concurrency limit
async function runConcurrent(tasks, concurrency) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const taskIdx = idx++;
      try {
        const result = await tasks[taskIdx]();
        results[taskIdx] = result;
      } catch(e) {
        results[taskIdx] = null;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

// Main
async function main() {
  console.log(`Kokopelli Full Catalog Scraper`);
  console.log(`Existing varieties: ${existingVarieties.length}`);
  console.log(`Names to skip: ${existingNames.size}`);
  console.log(`Output: ${OUTPUT_FILE}\n`);

  // Phase 1: Collect product URLs from all listing pages
  console.log(`Phase 1: Collecting URLs from ${TOTAL_PAGES} pages...`);

  const allProductUrls = new Set();

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const url = `${BASE_URL}/en/c/seeds?format=grid&limit=36&page=${page}&sort=name:asc`;
    try {
      const html = await fetchUrl(url);
      const urls = parseListingPage(html);
      for (const u of urls) allProductUrls.add(u);
      process.stdout.write(`\r  Page ${page}/${TOTAL_PAGES} — ${allProductUrls.size} URLs`);
      await sleep(DELAY_MS);
    } catch(err) {
      console.error(`\n  Error page ${page}: ${err.message}`);
      await sleep(2000);
    }
  }
  console.log(`\n  Total URLs: ${allProductUrls.size}\n`);

  // Phase 2: Fetch product pages with concurrency
  console.log(`Phase 2: Fetching ${allProductUrls.size} product pages (concurrency=${CONCURRENT})...`);

  const urlList = Array.from(allProductUrls);
  const allNewVarieties = [];
  let processed = 0;
  let skipped = 0;
  let added = 0;
  let errors = 0;

  // Process in batches
  const BATCH_SIZE = CONCURRENT;
  for (let i = 0; i < urlList.length; i += BATCH_SIZE) {
    const batch = urlList.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(batch.map(async (productUrl) => {
      try {
        const html = await fetchUrl(productUrl);
        return { url: productUrl, html };
      } catch(err) {
        return { url: productUrl, html: null, error: err.message };
      }
    }));

    for (const result of batchResults) {
      processed++;
      if (!result.html) {
        errors++;
        continue;
      }

      const variety = parseProductPage(result.html, result.url);
      if (!variety) {
        errors++;
        continue;
      }

      const normalizedName = normalizeNameForDedup(variety.name);
      if (existingNames.has(normalizedName)) {
        skipped++;
        continue;
      }

      existingNames.add(normalizedName);
      allNewVarieties.push(variety);
      added++;
    }

    process.stdout.write(`\r  [${processed}/${urlList.length}] +${added} new, ${skipped} skipped, ${errors} errors`);

    // Save periodically
    if (added > 0 && added % SAVE_EVERY === 0) {
      const combined = [...existingVarieties, ...allNewVarieties];
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(combined, null, 2));
      process.stdout.write(` [SAVED:${combined.length}]`);
    }

    // Rate limiting
    await sleep(DELAY_MS);
  }

  // Final save
  const combined = [...existingVarieties, ...allNewVarieties];
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(combined, null, 2));

  console.log(`\n\n=== COMPLETE ===`);
  console.log(`Processed: ${processed}`);
  console.log(`New varieties: ${added}`);
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total in file: ${combined.length}`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
