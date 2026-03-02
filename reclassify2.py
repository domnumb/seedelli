#!/usr/bin/env python3
"""Second-pass reclassification of 'divers' varieties in kokopelli.json"""

import json

with open('catalogs/kokopelli.json') as f:
    data = json.load(f)

# Rules: (keyword_in_name_lower, new_category, new_subcategory)
# Applied in order — first match wins
RULES = [
    # Physalis
    ('physalis', 'legumes-fruits', 'physalis'),

    # Flowers — ornamental
    ('celosia', 'fleurs', 'fleurs-annuelles'),
    ('coreopsis', 'fleurs', 'fleurs-vivaces'),
    ('chrysanthemum', 'fleurs', 'fleurs-annuelles'),
    ('cleome', 'fleurs', 'fleurs-annuelles'),
    ('gazania', 'fleurs', 'fleurs-annuelles'),
    ('gomphrena', 'fleurs', 'fleurs-annuelles'),
    ('iberis', 'fleurs', 'fleurs-annuelles'),
    ('liatris', 'fleurs', 'fleurs-vivaces'),
    ('oenothera', 'fleurs', 'fleurs-vivaces'),
    ('ratibida', 'fleurs', 'fleurs-vivaces'),
    ('reseda', 'fleurs', 'fleurs-annuelles'),
    ('salpiglossis', 'fleurs', 'fleurs-annuelles'),
    ('silene', 'fleurs', 'fleurs-vivaces'),
    ('snapdragon', 'fleurs', 'fleurs-annuelles'),
    ('trachymene', 'fleurs', 'fleurs-annuelles'),
    ('daisies', 'fleurs', 'fleurs-vivaces'),
    ('daturas', 'fleurs', 'fleurs-annuelles'),
    ('emilia', 'fleurs', 'fleurs-annuelles'),
    ('centratherum', 'fleurs', 'fleurs-annuelles'),
    ('asclepias', 'fleurs', 'fleurs-vivaces'),
    ('argemone', 'fleurs', 'fleurs-annuelles'),
    ('white laceflower', 'fleurs', 'fleurs-annuelles'),
    ('ammi', 'fleurs', 'fleurs-annuelles'),
    ('lobelia lobelia cardinalis', 'fleurs', 'fleurs-vivaces'),
    ('lobelia lobelia syphilitica', 'fleurs', 'fleurs-vivaces'),
    ('honey plant blends', 'fleurs', 'fleurs-annuelles'),
    ('mixes garden birds', 'fleurs', 'fleurs-annuelles'),
    ('mixes mediterranean turtles', 'fleurs', 'fleurs-annuelles'),

    # Medicinal
    ('sida cordifolia', 'medicinales', 'medicinales'),
    ('arnica', 'medicinales', 'medicinales'),
    ('baptisia', 'medicinales', 'medicinales'),
    ('codonopsis', 'medicinales', 'medicinales'),
    ('comfrey', 'medicinales', 'medicinales'),
    ('eclipta', 'medicinales', 'medicinales'),
    ('isatis', 'medicinales', 'medicinales'),
    ('leonotis', 'medicinales', 'medicinales'),
    ('licorice', 'medicinales', 'medicinales'),
    ('lobelia lobelia inflata', 'medicinales', 'medicinales'),
    ('lobelia lobelia spicata', 'medicinales', 'medicinales'),
    ('mimulus', 'medicinales', 'medicinales'),
    ('plantains', 'medicinales', 'medicinales'),
    ('pycnanthemum', 'medicinales', 'medicinales'),
    ('saffron', 'medicinales', 'medicinales'),
    ('silphium', 'medicinales', 'medicinales'),
    ('skullcap', 'medicinales', 'medicinales'),
    ('stylophorum', 'medicinales', 'medicinales'),
    ('tribulus', 'medicinales', 'medicinales'),
    ('vernonia', 'medicinales', 'medicinales'),
    ('amorpha', 'medicinales', 'medicinales'),
    ('amsonia', 'medicinales', 'medicinales'),
    ('bupleurum', 'medicinales', 'medicinales'),
    ('cochlear', 'medicinales', 'medicinales'),
    ('liatris', 'medicinales', 'medicinales'),  # already fleurs above, but some are medicinal

    # Aromatic
    ('chervil', 'aromatiques', 'aromatiques'),
    ('perillas', 'aromatiques', 'aromatiques'),
    ('dracocephalum', 'aromatiques', 'aromatiques'),
    ('nepeta', 'aromatiques', 'aromatiques'),
    ('sorrel', 'legumes-feuilles', 'legumes-feuilles'),  # oseille

    # Edible leaves / salad
    ('arroch', 'legumes-feuilles', 'legumes-feuilles'),
    ('baselles', 'legumes-feuilles', 'legumes-feuilles'),
    ('cardoons', 'legumes-feuilles', 'legumes-feuilles'),
    ('fedia', 'legumes-feuilles', 'legumes-feuilles'),
    ('ficoid', 'legumes-feuilles', 'legumes-feuilles'),
    ("lamb's quarters", 'legumes-feuilles', 'legumes-feuilles'),
    ('mescluns', 'legumes-feuilles', 'legumes-feuilles'),
    ('morelle wonderberry', 'legumes-feuilles', 'legumes-feuilles'),
    ('purslane', 'legumes-feuilles', 'legumes-feuilles'),
    ('portulaca', 'legumes-feuilles', 'legumes-feuilles'),
    ('scarlet ohno', 'legumes-feuilles', 'legumes-feuilles'),
    ('talinum', 'legumes-feuilles', 'legumes-feuilles'),
    ('tetragonal', 'legumes-feuilles', 'legumes-feuilles'),
    ('tuberous chervil', 'legumes-racines', 'legumes-racines'),

    # Roots
    ('rutabaga', 'legumes-racines', 'navets'),
    ('scorsonera', 'legumes-racines', 'legumes-racines'),

    # Legumes / cover crops
    ('desmanthus', 'engrais-verts', 'engrais-verts'),
    ('desmodium', 'engrais-verts', 'engrais-verts'),

    # Legumes-fruits
    ('cyclanthere', 'legumes-fruits', 'legumes-fruits'),
    ('coloquintes', 'legumes-fruits', 'courges'),
    ('hibiscus hibiscus sabdariffa', 'aromatiques', 'aromatiques'),

    # Cereales
    ('rice', 'cereales', 'cereales'),

    # Morelle (keep as divers — toxic/ornamental)
    ('morelle solanum', 'medicinales', 'medicinales'),
]

reclassified = 0
still_divers = 0

for v in data:
    if v.get('subcategory') != 'divers':
        continue
    name_lower = v['name'].lower()
    matched = False
    for keyword, new_cat, new_subcat in RULES:
        if keyword in name_lower:
            v['category'] = new_cat
            v['subcategory'] = new_subcat
            reclassified += 1
            matched = True
            break
    if not matched:
        still_divers += 1

print(f'Reclassifiés : {reclassified}')
print(f'Toujours divers : {still_divers}')

remaining = [v['name'] for v in data if v.get('subcategory') == 'divers']
print(f'Restants ({len(remaining)}): {remaining}')

with open('catalogs/kokopelli.json', 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Done.')
