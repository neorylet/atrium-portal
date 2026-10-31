-- Ensure a profile exists for the logged-in user
INSERT INTO supasheet.users (id, email, name)
SELECT id, email, 'Dana Okafor' 
FROM auth.users 
WHERE email = 'dana@atrium.example'
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;