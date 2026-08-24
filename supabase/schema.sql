-- Sistema Ribeiro — esquema de datos para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query

create schema if not exists aluvional;

-- Despachos (cargas de camiones)
create table if not exists aluvional.despachos (
  id bigint generated always as identity primary key,
  fecha date not null,
  hora text not null,
  guia text not null,
  carga numeric not null,
  chofer text not null default 'Sin asignar',
  created_at timestamptz not null default now()
);

-- Registros de producción
create table if not exists aluvional.produccion (
  id bigint generated always as identity primary key,
  fecha date not null,
  turno text not null,
  lts numeric,
  clima text,
  b1 numeric,
  b2 numeric,
  b3 numeric,
  created_at timestamptz not null default now()
);

-- Migración: elimina la columna "hs" (horas de máquina), ya no se usa.
alter table aluvional.produccion drop column if exists hs;

-- Migración: agrega clima y minutos por balde (3 tomas), que el formulario
-- "Nueva carga de producción" ya captura pero no se guardaban.
alter table aluvional.produccion add column if not exists clima text;
alter table aluvional.produccion add column if not exists b1 numeric;
alter table aluvional.produccion add column if not exists b2 numeric;
alter table aluvional.produccion add column if not exists b3 numeric;

-- Migración: "lts" (combustible) pasa a ser opcional.
alter table aluvional.produccion alter column lts drop not null;

-- Migración: elimina "hora" (no se usa en producción; el turno alcanza).
alter table aluvional.produccion drop column if exists hora;

-- Novedades CMASS: un texto de novedad por día
create table if not exists aluvional.novedades_cmass (
  fecha date primary key,
  texto text not null
);

-- Partes diarios de producción (un parte por fecha+turno)
create table if not exists aluvional.partes_diarios (
  id bigint generated always as identity primary key,
  fecha date not null,
  turno text not null,
  clima text,
  created_at timestamptz not null default now(),
  unique (fecha, turno)
);

-- Novedades por equipo dentro de un parte diario
create table if not exists aluvional.partes_equipos (
  id bigint generated always as identity primary key,
  parte_id bigint not null references aluvional.partes_diarios(id) on delete cascade,
  equipo text not null,
  inicio numeric,
  fin numeric,
  comentario text,
  created_at timestamptz not null default now()
);

-- Login: NO hay tabla de perfiles propia de Aluvional. Los dos sistemas
-- (Partes Diarios y Aluvional) comparten el mismo public.profiles y el mismo
-- pool de usuarios de Supabase Auth; lo que distingue a qué sistema puede
-- entrar cada usuario son dos columnas booleanas agregadas ahí:
--   public.profiles.aluvional        (acceso al sistema Aluvional)
--   public.profiles.partes_diarios   (acceso al sistema Partes Diarios)
-- Un usuario nuevo se crea con ambas en false (default de columna) y se
-- habilita a mano desde el SQL editor o el dashboard, ej.:
--   update public.profiles set aluvional = true where id = '...';
-- Ese trigger (on_auth_user_created -> public.handle_new_user()) vive en el
-- otro sistema/proyecto y no se modifica acá.

-- Función helper para políticas RLS: ¿el usuario logueado tiene habilitado
-- el sistema Aluvional?
create or replace function aluvional.tiene_acceso()
returns boolean
language sql
security definer
stable
set search_path to 'public'
as $$
  select coalesce(
    (select p.aluvional from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke execute on function aluvional.tiene_acceso() from public;
grant execute on function aluvional.tiene_acceso() to authenticated;

-- Row Level Security: cualquier usuario logueado con profiles.aluvional = true
-- puede leer y escribir. Sin distinción de roles por ahora dentro de Aluvional.
alter table aluvional.despachos enable row level security;
alter table aluvional.produccion enable row level security;
alter table aluvional.novedades_cmass enable row level security;
alter table aluvional.partes_diarios enable row level security;
alter table aluvional.partes_equipos enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['despachos', 'produccion', 'novedades_cmass', 'partes_diarios', 'partes_equipos']
  loop
    execute format('drop policy if exists "anon full access" on aluvional.%I', t);
    execute format('drop policy if exists "lectura autenticados" on aluvional.%I', t);
    execute format('drop policy if exists "insercion operadores" on aluvional.%I', t);
    execute format('drop policy if exists "actualizacion operadores" on aluvional.%I', t);
    execute format('drop policy if exists "eliminacion operadores" on aluvional.%I', t);

    execute format('drop policy if exists "acceso aluvional" on aluvional.%I', t);
    execute format('create policy "acceso aluvional" on aluvional.%I for all to authenticated using (aluvional.tiene_acceso()) with check (aluvional.tiene_acceso())', t);
  end loop;
end
$$;

-- PostgREST (la API que usa supabase-js) sólo expone esquemas a los que
-- los roles anon/authenticated tienen GRANT explícito, más allá de RLS.
-- A partir del login propio, "anon" ya no tiene acceso: todo pasa por
-- autenticación (RLS de arriba decide qué puede hacer cada usuario).
grant usage on schema aluvional to authenticated;
grant all on all tables in schema aluvional to authenticated;
grant all on all sequences in schema aluvional to authenticated;
alter default privileges in schema aluvional grant all on tables to authenticated;
alter default privileges in schema aluvional grant all on sequences to authenticated;

revoke all on aluvional.despachos, aluvional.produccion, aluvional.novedades_cmass,
  aluvional.partes_diarios, aluvional.partes_equipos from anon;
revoke all on all sequences in schema aluvional from anon;
revoke usage on schema aluvional from anon;
alter default privileges in schema aluvional revoke all on tables from anon;
alter default privileges in schema aluvional revoke all on sequences from anon;

-- La app necesita leer su propio flag de acceso desde public.profiles, que
-- vive fuera del schema por defecto del cliente ("aluvional"); se consulta
-- con supabase.schema('public').from('profiles')... en el frontend. El
-- schema public y la tabla profiles ya están expuestos a "authenticated"
-- por el otro sistema (Partes Diarios), no hace falta otorgar nada más.
