const d = require('/Users/mael/projects/seedelli/catalogs/kokopelli-full.json');
const cats = ['tomates', 'poivrons', 'courges', 'carottes', 'laitues', 'haricots', 'basilic'];
cats.forEach(cat => {
  const v = d.find(x => x.subcategory === cat && x.sowing_indoor && x.sowing_indoor.length > 0);
  if (v) console.log(cat + ': ' + v.name + ' | ' + (v.latin || 'N/A') + ' | sow_indoor:' + JSON.stringify(v.sowing_indoor) + ' | harvest:' + JSON.stringify(v.harvest));
});
// Check one medicinal
const med = d.find(x => x.category === 'medicinales');
if (med) console.log('medicinal: ' + med.name + ' | ' + (med.latin || 'N/A'));
// Check one flower
const fle = d.find(x => x.category === 'fleurs');
if (fle) console.log('fleurs: ' + fle.name + ' | ' + (fle.latin || 'N/A'));
