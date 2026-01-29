INSERT INTO api_keys (consumer_key, consumer_secret, permissions, description)
VALUES (
  'ck_live_generated_ccc_user',
  'cs_live_generated_ccc_secret',
  'read_write',
  'Generated for CCC Local Access'
)
ON CONFLICT (consumer_key) DO UPDATE 
SET consumer_secret = 'cs_live_generated_ccc_secret';

-- Output the keys for the user
SELECT 'Key Created:' as status, 
       'ck_live_generated_ccc_user' as consumer_key, 
       'cs_live_generated_ccc_secret' as consumer_secret;
