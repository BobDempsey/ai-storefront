-- Demo catalog: finished 3D-printed goods.
-- Images live in public/images/ and are served by Nuxt from the site root.

insert into public.products (slug, name, description, price_cents, image_url) values
  ('articulated-dragon',    'Articulated Dragon',    'Print-in-place PLA, 92 links, 11" nose to tail.', 2400, '/images/articulated-dragon.jpg'),
  ('desk-cable-organizer',  'Desk Cable Organizer',  'Weighted PETG base, five channels, non-slip pads.', 1600, '/images/desk-cable-organizer.jpg'),
  ('self-watering-planter', 'Self-Watering Planter', 'Two-part PETG shell, wicking reservoir, 5" pot.', 3200, '/images/self-watering-planter.jpg'),
  ('lithophane-night-lamp', 'Lithophane Night Lamp', 'Translucent PLA panel, warm LED, USB-C powered.', 4800, '/images/lithophane-night-lamp.jpg'),
  ('hex-dice-tower',        'Hex Dice Tower',        'Matte PLA, felt-lined tray, folds flat for travel.', 5400, '/images/hex-dice-tower.jpg'),
  ('stackable-drawer-bins', 'Stackable Drawer Bins', 'Six nesting PETG bins, ribbed walls, 2" deep.', 2900, '/images/stackable-drawer-bins.jpg')
on conflict (slug) do nothing;

-- Downloadable files. Sizes are bytes; the storefront formats them.
insert into public.products (slug, name, description, price_cents, kind, file_name, file_format, file_size_bytes) values
  ('articulated-dragon-project', 'Articulated Dragon Project File', 'Slicer project with print settings, supports and two filament colours set up. Opens in PrusaSlicer, Orca or Bambu Studio.', 900,  'digital', 'articulated-dragon.3mf', '3MF', 26004684),
  ('hex-dice-tower-model',       'Hex Dice Tower Model',            'Plain triangle mesh, the format every desktop printer accepts. Slice it yourself and choose your own layer height and infill.',        600,  'digital', 'hex-dice-tower.stl',    'STL', 8598323),
  ('drawer-bins-parametric',     'Drawer Bins Parametric Source',   'Editable CAD source for the drawer bins. Change the width, depth and rib spacing, then export your own sizes.',                     1400, 'digital', 'drawer-bins.step',      'STEP', 3355443)
on conflict (slug) do nothing;
