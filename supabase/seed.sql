-- ====================================================================
-- WOMEN'S HEALTH APP: MOCK SEED DATA
-- ====================================================================
-- Note: Run this script IN THE SUPABASE SQL EDITOR AFTER applying schema.sql
-- It creates a mock user and generates 3 months of historical data.

DO $$
DECLARE
  mock_user_id UUID := '00000000-0000-0000-0000-000000000000';
  cycle1_id UUID := uuid_generate_v4();
  cycle2_id UUID := uuid_generate_v4();
  cycle3_id UUID := uuid_generate_v4();
BEGIN
  -- 1. Create a mock user in auth.users (if it doesn't exist)
  -- Supabase allows this for superusers/postgres role.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = mock_user_id) THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      mock_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
      'test@example.com', 'hashedpassword', now(), 
      '{"provider":"email","providers":["email"]}', '{"full_name":"Test User"}', now(), now()
    );
  END IF;

  -- 2. Update Profile & Settings (they were auto-created by the trigger)
  UPDATE public.profiles SET dob = '1995-05-15' WHERE id = mock_user_id;
  UPDATE public.settings SET cycle_length_days = 28, period_length_days = 5 WHERE id = mock_user_id;

  -- 3. Generate Cycles (Past 3 Months)
  -- Cycle 1: 3 months ago
  INSERT INTO public.cycles (id, user_id, start_date, end_date, expected_end_date)
  VALUES (cycle1_id, mock_user_id, current_date - 84, current_date - 57, current_date - 56);
  
  -- Cycle 2: 2 months ago
  INSERT INTO public.cycles (id, user_id, start_date, end_date, expected_end_date)
  VALUES (cycle2_id, mock_user_id, current_date - 56, current_date - 29, current_date - 28);

  -- Cycle 3: Current active cycle (started 28 days ago)
  INSERT INTO public.cycles (id, user_id, start_date, end_date, expected_end_date)
  VALUES (cycle3_id, mock_user_id, current_date - 28, null, current_date);

  -- 4. Period Logs
  -- Cycle 1 Periods
  INSERT INTO public.period_logs (user_id, cycle_id, date, flow_level) VALUES
  (mock_user_id, cycle1_id, current_date - 84, 'light'),
  (mock_user_id, cycle1_id, current_date - 83, 'heavy'),
  (mock_user_id, cycle1_id, current_date - 82, 'medium'),
  (mock_user_id, cycle1_id, current_date - 81, 'medium'),
  (mock_user_id, cycle1_id, current_date - 80, 'spotting');

  -- Cycle 2 Periods
  INSERT INTO public.period_logs (user_id, cycle_id, date, flow_level) VALUES
  (mock_user_id, cycle2_id, current_date - 56, 'light'),
  (mock_user_id, cycle2_id, current_date - 55, 'heavy'),
  (mock_user_id, cycle2_id, current_date - 54, 'heavy'),
  (mock_user_id, cycle2_id, current_date - 53, 'medium'),
  (mock_user_id, cycle2_id, current_date - 52, 'spotting');

  -- Cycle 3 Periods
  INSERT INTO public.period_logs (user_id, cycle_id, date, flow_level) VALUES
  (mock_user_id, cycle3_id, current_date - 28, 'light'),
  (mock_user_id, cycle3_id, current_date - 27, 'heavy'),
  (mock_user_id, cycle3_id, current_date - 26, 'medium'),
  (mock_user_id, cycle3_id, current_date - 25, 'light');

  -- 5. Symptoms & Moods
  INSERT INTO public.symptoms (user_id, date, symptom_type, severity) VALUES
  (mock_user_id, current_date - 28, 'cramps', 4),
  (mock_user_id, current_date - 27, 'cramps', 5),
  (mock_user_id, current_date - 27, 'headache', 3),
  (mock_user_id, current_date - 26, 'bloating', 4),
  (mock_user_id, current_date - 14, 'tender breasts', 3);

  INSERT INTO public.moods (user_id, date, mood_type, intensity) VALUES
  (mock_user_id, current_date - 28, 'irritable', 4),
  (mock_user_id, current_date - 27, 'sad', 3),
  (mock_user_id, current_date - 14, 'happy', 4),
  (mock_user_id, current_date - 2, 'anxious', 3);

  -- 6. Logs (Water, Sleep, Weight)
  INSERT INTO public.water_logs (user_id, date, amount_ml) VALUES
  (mock_user_id, current_date - 2, 1500),
  (mock_user_id, current_date - 1, 2200),
  (mock_user_id, current_date, 1800);

  INSERT INTO public.sleep_logs (user_id, date, hours, quality) VALUES
  (mock_user_id, current_date - 2, 6.5, 'fair'),
  (mock_user_id, current_date - 1, 8.0, 'excellent'),
  (mock_user_id, current_date, 7.5, 'good');

  INSERT INTO public.weight_logs (user_id, date, weight_kg) VALUES
  (mock_user_id, current_date - 30, 65.5),
  (mock_user_id, current_date - 15, 65.0),
  (mock_user_id, current_date, 66.0);

  -- 7. Medications & Reminders
  INSERT INTO public.medications (user_id, name, dosage, frequency) VALUES
  (mock_user_id, 'Iron Supplement', '65mg', 'Daily'),
  (mock_user_id, 'Birth Control', '1 pill', 'Daily');

  INSERT INTO public.reminders (user_id, title, time, type) VALUES
  (mock_user_id, 'Take Birth Control', '20:00', 'medication'),
  (mock_user_id, 'Drink Water', '10:00', 'water');

  -- 8. Notes & AI History
  INSERT INTO public.notes (user_id, date, content) VALUES
  (mock_user_id, current_date - 27, 'Felt really tired today, taking it easy.'),
  (mock_user_id, current_date - 14, 'Ovulation day! Feeling energetic.');

  INSERT INTO public.ai_history (user_id, prompt, response) VALUES
  (mock_user_id, 'Why am I craving chocolate so much before my period?', 'Craving chocolate before your period is very common. It is often linked to fluctuations in hormones like estrogen and progesterone... (AI Response)');

END $$;
