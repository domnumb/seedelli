#!/usr/bin/env node
// patch-product-urls.js
// Scrapes the French Kokopelli listing pages (68 pages) to collect
// (product_url, alt_name) pairs, then matches against catalogs/kokopelli.json
// by fuzzy name normalization and patches product_url in-place.

const https = require('https');
const fs = require('fs');

const CATALOG_FILE = '/Users/mael/projects/seedelli/catalogs/kokopelli.json';
const BASE_URL = 'https://kokopelli-semences.com';
const TOTAL_PAGES = 68;
const DELAY_MS = 600;

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
          'Accept-Language': 'fr-FR,fr;q=0.9',
        }
      }, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          const loc = res.headers.location;
          const redir = loc.startsWith('http') ? loc : BASE_URL + loc;
          fetchUrl(redir, n).then(resolve).catch(reject);
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) resolve(data);
          else if ((res.statusCode === 429 || res.statusCode === 503) && n > 0) setTimeout(() => attempt(n - 1), 3000);
          else if (res.statusCode === 404) resolve('');
          else reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        });
      });
      req.on('error', (err) => { if (n > 0) setTimeout(() => attempt(n - 1), 2000); else reject(err); });
      req.setTimeout(15000, () => { req.destroy(); if (n > 0) setTimeout(() => attempt(n - 1), 2000); else reject(new Error(`Timeout`)); });
    };
    attempt(retries);
  });
}

// Normalize a name for fuzzy matching: lowercase, remove accents, keep only alphanumeric
function normalize(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '');
}

// Parse one listing page → array of { url, altName }
function parsePage(html) {
  const results = [];
  const articleRe = /<article class="productcard2024">([\s\S]*?)<\/article>/g;
  let m;
  while ((m = articleRe.exec(html)) !== null) {
    const article = m[1];
    const urlM = article.match(/href="(https?:\/\/kokopelli-semences\.com\/fr\/p\/[^"]+)"/);
    const altM = article.match(/alt="([^"]+)"/);
    if (urlM && altM) {
      results.push({ url: urlM[1], altName: altM[1].trim() });
    }
  }
  return results;
}

async function main() {
  const varieties = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const alreadyDone = varieties.filter(v => v.product_url).length;
  console.log(`Loaded ${varieties.length} varieties (${alreadyDone} already have product_url)`);
  console.log(`Fetching ${TOTAL_PAGES} listing pages from Kokopelli FR…`);

  // Phase 1: collect all product URLs from listing pages
  const productMap = new Map(); // normalized altName → { url, altName }
  let pageErrors = 0;

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const url = `${BASE_URL}/fr/c/semences?format=grid&limit=36&page=${page}&sort=name:asc`;
    try {
      const html = await fetchUrl(url);
      const items = parsePage(html);
      for (const item of items) {
        productMap.set(normalize(item.altName), item);
      }
      process.stdout.write(`\r  Page ${page}/${TOTAL_PAGES} — ${productMap.size} products collected`);
    } catch(err) {
      pageErrors++;
    }
    await sleep(DELAY_MS);
  }
  console.log(`\n  Done. ${productMap.size} unique products, ${pageErrors} page errors.\n`);

  // Phase 2: match varieties to product URLs
  let matched = 0, skipped = 0, alreadyHad = 0;

  for (const v of varieties) {
    if (v.product_url) { alreadyHad++; continue; }

    const normName = normalize(v.name);

    // Strategy 1: exact match
    if (productMap.has(normName)) {
      v.product_url = productMap.get(normName).url;
      matched++;
      continue;
    }

    // Strategy 2: find an altName that contains the variety name
    let bestMatch = null;
    let bestAltLen = Infinity;
    for (const [normAlt, item] of productMap) {
      if (normAlt.includes(normName) && normAlt.length < bestAltLen) {
        bestMatch = item;
        bestAltLen = normAlt.length;
      }
    }
    if (bestMatch) {
      v.product_url = bestMatch.url;
      matched++;
      continue;
    }

    // Strategy 3: variety name contains the altName (altName is prefix/suffix)
    let bestMatch3 = null;
    let bestAltLen3 = 0;
    for (const [normAlt, item] of productMap) {
      if (normName.includes(normAlt) && normAlt.length > bestAltLen3) {
        bestMatch3 = item;
        bestAltLen3 = normAlt.length;
      }
    }
    if (bestMatch3 && bestAltLen3 > 4) {
      v.product_url = bestMatch3.url;
      matched++;
      continue;
    }

    skipped++;
  }

  fs.writeFileSync(CATALOG_FILE, JSON.stringify(varieties, null, 2));

  console.log(`=== DONE ===`);
  console.log(`Already had product_url: ${alreadyHad}`);
  console.log(`Matched and patched: ${matched}`);
  console.log(`Unmatched (keep search URL): ${skipped}`);
  console.log(`File saved: ${CATALOG_FILE}`);

  // Debug: show a few unmatched
  const unmatched = varieties.filter(v => !v.product_url).slice(0, 10);
  if (unmatched.length) {
    console.log('\nSample unmatched:');
    unmatched.forEach(v => console.log(`  - ${v.name} (${v.id})`));
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
