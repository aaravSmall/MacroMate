-- Sample global foods for local development (`supabase db reset` runs this after migrations).
-- Values are per serving, approximated from USDA FoodData Central generic entries.

insert into public.foods (
  name, brand, source, serving_size, serving_unit, serving_grams,
  calories, protein_g, carbs_g, fat_g, micronutrients
) values
  ('Chicken breast, skinless, roasted', null, 'manual', 100, 'g', 100,
    165, 31.0, 0.0, 3.6,
    '{"sodium_mg": 74, "cholesterol_mg": 85, "saturated_fat_g": 1.0}'),
  ('White rice, long-grain, cooked', null, 'manual', 1, 'cup', 158,
    205, 4.3, 44.5, 0.4,
    '{"sodium_mg": 2, "fiber_g": 0.6, "sugar_g": 0.1}'),
  ('Brown rice, long-grain, cooked', null, 'manual', 1, 'cup', 195,
    218, 4.5, 45.8, 1.6,
    '{"sodium_mg": 2, "fiber_g": 3.5, "magnesium_mg": 84}'),
  ('Turkey breast, deli sliced', null, 'manual', 2, 'oz', 56,
    60, 10.0, 2.0, 1.0,
    '{"sodium_mg": 500, "cholesterol_mg": 25, "sugar_g": 1.0, "saturated_fat_g": 0.3}'),
  ('Egg, whole, large', null, 'manual', 1, 'large', 50,
    72, 6.3, 0.4, 4.8,
    '{"sodium_mg": 71, "cholesterol_mg": 186, "saturated_fat_g": 1.6}'),
  ('Banana, medium', null, 'manual', 1, 'medium', 118,
    105, 1.3, 27.0, 0.4,
    '{"fiber_g": 3.1, "sugar_g": 14.4, "potassium_mg": 422}'),
  ('Apple, medium, with skin', null, 'manual', 1, 'medium', 182,
    95, 0.5, 25.1, 0.3,
    '{"fiber_g": 4.4, "sugar_g": 18.9, "potassium_mg": 195}'),
  ('Rolled oats, dry', null, 'manual', 0.5, 'cup', 40,
    150, 5.0, 27.0, 3.0,
    '{"fiber_g": 4.0, "sugar_g": 0.4, "magnesium_mg": 55, "zinc_mg": 1.5}'),
  ('Milk, whole', null, 'manual', 1, 'cup', 244,
    149, 7.7, 11.7, 7.9,
    '{"sodium_mg": 105, "cholesterol_mg": 24, "sugar_g": 12.3, "saturated_fat_g": 4.6, "calcium_mg": 276}'),
  ('Broccoli, raw, chopped', null, 'manual', 1, 'cup', 91,
    31, 2.5, 6.0, 0.3,
    '{"sodium_mg": 30, "fiber_g": 2.4, "sugar_g": 1.5, "potassium_mg": 288}'),
  ('Peanut butter, smooth', null, 'manual', 2, 'tbsp', 32,
    190, 7.0, 7.0, 16.0,
    '{"sodium_mg": 140, "fiber_g": 2.0, "sugar_g": 3.0, "saturated_fat_g": 3.3, "magnesium_mg": 49}');

-- ---------------------------------------------------------------------------
-- Demo account for development: username "demo" (email demo@example.com), password "demo123".
-- The app maps the "demo" username to this email (src/features/auth/demoAccount.ts).
-- The credentials are public in this repo, so only seed projects you use for development.
-- The on_auth_user_created trigger creates its profile and settings rows; it starts at
-- onboarding like any new user.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000',
  'd3e0d3e0-0000-4000-8000-00000000de30',
  'authenticated',
  'authenticated',
  'demo@example.com',
  extensions.crypt('demo123', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(),
  now(),
  '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  'd3e0d3e0-0000-4000-8000-00000000de30',
  'd3e0d3e0-0000-4000-8000-00000000de30',
  'd3e0d3e0-0000-4000-8000-00000000de30',
  'email',
  '{"sub": "d3e0d3e0-0000-4000-8000-00000000de30", "email": "demo@example.com", "email_verified": true}',
  now(),
  now(),
  now()
) on conflict do nothing;
