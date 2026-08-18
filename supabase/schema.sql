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
  hora text not null default '00:00',
  turno text not null,
  lts numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Migración: agrega la columna "hora" si la tabla ya existía sin ella
-- (habilita el filtro por hora en Registro de producción).
alter table aluvional.produccion add column if not exists hora text not null default '00:00';

-- Migración: elimina la columna "hs" (horas de máquina), ya no se usa.
alter table aluvional.produccion drop column if exists hs;

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

-- Row Level Security
-- La app todavía no tiene login propio, así que por ahora se habilita
-- acceso completo para el rol "anon" (mismo modelo de seguridad que tenía
-- la app en memoria). Cuando se agregue autenticación, reemplazar estas
-- políticas por reglas basadas en auth.uid().
alter table aluvional.despachos enable row level security;
alter table aluvional.produccion enable row level security;
alter table aluvional.novedades_cmass enable row level security;
alter table aluvional.partes_diarios enable row level security;
alter table aluvional.partes_equipos enable row level security;

create policy "anon full access" on aluvional.despachos for all using (true) with check (true);
create policy "anon full access" on aluvional.produccion for all using (true) with check (true);
create policy "anon full access" on aluvional.novedades_cmass for all using (true) with check (true);
create policy "anon full access" on aluvional.partes_diarios for all using (true) with check (true);
create policy "anon full access" on aluvional.partes_equipos for all using (true) with check (true);

-- PostgREST (la API que usa supabase-js) sólo expone esquemas a los que
-- los roles anon/authenticated tienen GRANT explícito, más allá de RLS.
grant usage on schema aluvional to anon, authenticated;
grant all on all tables in schema aluvional to anon, authenticated;
grant all on all sequences in schema aluvional to anon, authenticated;
alter default privileges in schema aluvional grant all on tables to anon, authenticated;
alter default privileges in schema aluvional grant all on sequences to anon, authenticated;
