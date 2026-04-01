
-- Update Starter plan limits
UPDATE public.plans SET
  limits = jsonb_set(
    jsonb_set(
      jsonb_set(limits, '{orders_per_month}', '300'),
      '{leads}', '2000'
    ),
    '{campaigns_per_month}', '5'
  ),
  features = '["3 checkouts ativos","300 pedidos/mês","2.000 leads","5 fluxos de automação","1 instância WhatsApp","Suporte via chat"]'::jsonb
WHERE slug = 'starter';

-- Update Pro plan limits
UPDATE public.plans SET
  limits = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(limits, '{orders_per_month}', '1500'),
        '{leads}', '15000'
      ),
      '{flows}', '25'
    ),
    '{campaigns_per_month}', '15'
  ),
  features = '["10 checkouts ativos","1.500 pedidos/mês","15.000 leads","25 fluxos + IA","3 instâncias WhatsApp","5.000 tokens de voz inclusos","Analytics avançado","API Access"]'::jsonb
WHERE slug = 'pro';

-- Update Enterprise features text
UPDATE public.plans SET
  features = '["Checkouts ilimitados","Pedidos ilimitados","Leads ilimitados","Fluxos ilimitados","10 instâncias WhatsApp","20.000 tokens de voz","Domínio customizado","SLA garantido","Suporte prioritário"]'::jsonb
WHERE slug = 'enterprise';
