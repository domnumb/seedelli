const d = require('/Users/mael/projects/seedelli/catalogs/kokopelli-full.json');
console.log('Total varieties:', d.length);

// Count by category
const cats = {};
d.forEach(v => { cats[v.category] = (cats[v.category] || 0) + 1; });
console.log('\nCategories:');
Object.entries(cats).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log('  ' + k + ': ' + v));

// Quality checks
const withDesc = d.filter(v => v.desc && v.desc.length > 20);
const withLatin = d.filter(v => v.latin && v.latin.length > 3);
const withHarvest = d.filter(v => v.harvest && v.harvest.length > 0);
const withSow = d.filter(v => (v.sowing_indoor && v.sowing_indoor.length > 0) || (v.sowing_outdoor && v.sowing_outdoor.length > 0));

console.log('\nQuality:');
console.log('  With descriptions:', withDesc.length, '(' + Math.round(withDesc.length/d.length*100) + '%)');
console.log('  With latin names:', withLatin.length, '(' + Math.round(withLatin.length/d.length*100) + '%)');
console.log('  With harvest months:', withHarvest.length);
console.log('  With sowing months:', withSow.length);

// Sample
console.log('\nSample entry [index 200]:');
console.log(JSON.stringify(d[200], null, 2));
