insert into public.products (slug, name, description, price_cents, image_url) values
  ('walnut-serving-board', 'Walnut Serving Board', 'Hand-finished black walnut, 18" x 10".', 8900, 'https://picsum.photos/seed/board/800/800'),
  ('linen-apron',          'Linen Apron',          'Heavyweight washed linen with brass hardware.', 6400, 'https://picsum.photos/seed/apron/800/800'),
  ('stoneware-mug',        'Stoneware Mug',        'Wheel-thrown, 12oz, dishwasher safe.', 2800, 'https://picsum.photos/seed/mug/800/800'),
  ('copper-measuring-set', 'Copper Measuring Set', 'Four nesting cups, unlacquered copper.', 5200, 'https://picsum.photos/seed/copper/800/800')
on conflict (slug) do nothing;
