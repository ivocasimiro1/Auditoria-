-- Activar extensões necessárias (correr uma vez no Supabase SQL Editor)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Agendar briefing diário às 09:00 UTC = 10:00 Portugal (verão WEST/UTC+1)
select cron.schedule(
  'depositos-briefing-diario',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://ubeqidccuvsjhjphybxz.supabase.co/functions/v1/daily-briefing',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZXFpZGNjdXZzamhqcGh5Ynh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDI0NTYsImV4cCI6MjA5NTkxODQ1Nn0.wyCBBMSuRfxrz935XifGa3Chgv64o4-ACvP5rCj7t1U',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Verificar que ficou agendado
select * from cron.job where jobname = 'depositos-briefing-diario';
