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
