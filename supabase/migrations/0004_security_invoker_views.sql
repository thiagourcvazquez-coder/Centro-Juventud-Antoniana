-- Las vistas de stats corren con los permisos de quien consulta (no del creador),
-- asi respetan RLS. Las tablas base ya tienen lectura publica.
alter view public.v_standings set (security_invoker = on);
alter view public.v_promedios set (security_invoker = on);
alter view public.v_team_form set (security_invoker = on);
