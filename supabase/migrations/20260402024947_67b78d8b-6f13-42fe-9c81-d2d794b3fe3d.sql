UPDATE public.whatsapp_instances
SET evolution_server_url = 'https://api-evolution-api.1h7ium.easypanel.host',
    api_key = '429683C4C977415CAAFCCE10F7D57E11'
WHERE id = 'e616f5e3-5d53-44a3-af20-c2fad9e09d68'
  AND provider = 'evolution'
  AND evolution_server_url IS NULL;