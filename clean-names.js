// Post-process: clean names by removing Kokopelli's category prefix
// e.g. "Tomatoes Amateur's Dream" -> "Amateur's Dream"
// e.g. "Cherry tomatoes Abracazebra" -> "Abracazebra"
// But preserve names that are inherently the full name (like latin genus species)

const fs = require('fs');
const INPUT = '/Users/mael/projects/seedelli/catalogs/kokopelli-full.json';
const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// Prefixes to strip from product names (from Kokopelli's JSON-LD naming convention)
// Pattern: "CategoryName VarietyName" -> strip "CategoryName "
const PREFIXES_TO_STRIP = [
  // Tomatoes
  'Cherry tomatoes ', 'Tomatoes ', 'Tomato ',
  // Peppers
  'Sweet bell pepper ', 'Peppers ', 'Pepper ',
  // Eggplants
  'Eggplants ', 'Eggplant ',
  // Squash/cucurbits
  'Zucchini ', 'Squash ', 'Pumpkin ', 'Cucumbers ', 'Cucumber ',
  'Gherkins ', 'Gherkin ', 'Melon ', 'Melons ', 'Watermelon ', 'Watermelons ',
  'Maxima squash ', 'Gourd ', 'Gourds ',
  // Beans/legumes
  'Common bean ', 'Common beans ', 'Dwarf bean ', 'Climbing bean ', 'Rowing common bean ',
  'Runner bean ', 'Runner beans ', 'Broad bean ', 'Broad beans ', 'Soya beans ', 'Soya bean ',
  'Sweet peas ', // not flowers
  // Cereals/grains
  'Corn ', 'Sweet corn ', 'Popcorn ', 'Maize ', 'Quinoa ', 'Amaranth ',
  'Sorghum ', 'Wheat ', 'Barley ',
  // Root vegetables
  'Carrots ', 'Carrot ', 'Beet ', 'Beets ', 'Beetroot ',
  'Radish ', 'Radishes ', 'Turnip ', 'Turnips ', 'Parsnip ', 'Parsnips ',
  'Celeriac ', 'Scorzonera ', 'Salsify ',
  // Leafy veg
  'Lettuces ', 'Lettuce ', 'To cut lettuce ', 'To cut lettuces ',
  'Spinach ', 'Spinachs ', 'Chard ', 'Chards ',
  'Cabbage ', 'Cabbages ', 'Red cabbage ', 'Kale ', 'Broccoli ', 'Cauliflower ',
  'Celery ', 'Leek ', 'Leeks ', 'Onion ', 'Onions ',
  'Shallot ', 'Artichoke ', 'Artichokes ', 'Asparagus ',
  'Fennel ', 'Okra ', 'Okras ',
  // Aromatics
  'Basil ', 'Thyme ', 'Sage ', 'Oregano ', 'Parsley ', 'Coriander ',
  'Dill ', 'Chive ', 'Chives ', 'Mint ', 'Rosemary ', 'Lavender ',
  'Lavenders ', 'Agastaches ', 'Hyssop ', 'Savory ', 'Stevia ',
  'Lemon balm ', 'Marjoram ', 'Anise ', 'Tarragon ',
  // Flowers
  'Poppies ', 'Poppy ', 'California poppy ', 'Cosmos ', 'Cosmo ',
  'Sunflowers ', 'Sunflower ', 'Marigold ', 'Marigolds ', 'Zinnia ', 'Zinnias ',
  'Nasturtium ', 'Nasturtiums ', 'Calendula ', 'Calendulas ', 'Cornflower ',
  'Cornflowers ', 'Dahlia ', 'Dahlias ', 'Hollyhock ', 'Hollyhocks ',
  'African daisy ', 'Sweet pea ', 'Sweet peas ', 'Borage ', 'Nigella ',
  // Medicinal
  'Artemisia ', 'Withania ', 'Echinacea ', 'Valerian ', 'Andrographis ',
  // Green manures
  'Alfalfa ', 'Clover ', 'Phacelia ',
];

let cleaned = 0;
data.forEach(v => {
  // Only clean names from the new batch (not the original 165 which have French names)
  // Check if name starts with an English category word
  for (const prefix of PREFIXES_TO_STRIP) {
    if (v.name.startsWith(prefix)) {
      v.name = v.name.slice(prefix.length);
      // Update kokopelli_url with cleaned name
      v.kokopelli_url = `https://kokopelli-semences.fr/fr/c/search?search=${encodeURIComponent(v.name)}`;
      cleaned++;
      break;
    }
  }
});

console.log('Cleaned names:', cleaned);
console.log('Sample cleaned:', data[200].name);

fs.writeFileSync(INPUT, JSON.stringify(data, null, 2));
console.log('Saved to', INPUT);
