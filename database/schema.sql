-- =====================================================================
-- Genealogy database: version 1 (structure only)
-- Run this once in the Supabase SQL Editor.
-- Design notes: see docs/DESIGN.md
--
-- Everything is optional except IDs and creators.
-- Every table is LOCKED (row-level security on, no access rules yet).
-- Rules for who can see and change what come in a later step.
-- =====================================================================

-- Fuzzy name matching (finds "Evelyn O. Jones" when searching "Evelyn Ovetta Jones")
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;


-- ---------------------------------------------------------------------
-- PEOPLE
-- ---------------------------------------------------------------------
create table public.people (
  id               uuid primary key default gen_random_uuid(),  -- permanent, never changes
  code             text,                                        -- readable label, e.g. BJW-19780330

  first_name       text,
  middle_name      text,
  last_name        text,
  maiden_name      text,
  sex              text check (sex in ('M', 'F', 'U')),         -- M, F, or U (unknown/other)

  -- Dates are stored as written ("abt 1850") plus a clean year for sorting.
  birth_date_text  text,
  birth_year       integer,
  birth_place      text,
  death_date_text  text,
  death_year       integer,
  death_place      text,
  baptism_date_text text,
  baptism_place    text,

  -- Privacy-safe default: treat as living until the app (or the owner) says otherwise.
  is_living        boolean not null default true,

  created_by       uuid not null default auth.uid(),            -- who created this record
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- If this record was merged into another, it points there (and is never deleted).
  merged_into      uuid references public.people (id),
  check (merged_into is null or merged_into <> id),

  -- Helper column for duplicate matching. Filled in automatically.
  search_name      text generated always as (
    lower(regexp_replace(
      trim(coalesce(first_name, '') || ' ' || coalesce(middle_name, '') || ' ' ||
           coalesce(last_name, '') || ' ' || coalesce(maiden_name, '')),
      '[^[:alnum:][:space:]]', '', 'g'))
  ) stored
);

create index people_search_name_idx on public.people using gin (search_name extensions.gin_trgm_ops);
create index people_birth_year_idx  on public.people (birth_year);
create index people_created_by_idx  on public.people (created_by);
create index people_merged_into_idx on public.people (merged_into);


-- ---------------------------------------------------------------------
-- FAMILIES  (a couple; either partner may be unknown; mirrors GEDCOM "FAM")
-- ---------------------------------------------------------------------
create table public.families (
  id               uuid primary key default gen_random_uuid(),
  partner1_id      uuid references public.people (id),
  partner2_id      uuid references public.people (id),
  marriage_date_text text,
  marriage_year    integer,
  marriage_place   text,
  end_date_text    text,
  end_year         integer,
  end_reason       text check (end_reason in ('divorce', 'death', 'annulment', 'other')),
  marriage_order   integer,                                     -- optional: 1st, 2nd marriage...
  created_by       uuid not null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (partner1_id is not null or partner2_id is not null),
  check (partner1_id is null or partner2_id is null or partner1_id <> partner2_id)
);

create index families_partner1_idx on public.families (partner1_id);
create index families_partner2_idx on public.families (partner2_id);


-- ---------------------------------------------------------------------
-- FAMILY CHILDREN  (which children belong to which family)
-- ---------------------------------------------------------------------
create table public.family_children (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references public.families (id) on delete cascade,
  child_id         uuid not null references public.people (id),
  relationship     text not null default 'birth' check (relationship in ('birth', 'adoptive')),
  birth_order      integer,                                     -- optional
  created_by       uuid not null default auth.uid(),
  created_at       timestamptz not null default now(),
  unique (family_id, child_id)
);

create index family_children_child_idx on public.family_children (child_id);


-- ---------------------------------------------------------------------
-- NOTES AND SOURCES  (attached to a person OR a family)
-- ---------------------------------------------------------------------
create table public.notes_and_sources (
  id               uuid primary key default gen_random_uuid(),
  person_id        uuid references public.people (id),
  family_id        uuid references public.families (id),
  kind             text not null default 'note' check (kind in ('note', 'source')),
  body             text,
  citation         text,
  created_by       uuid not null default auth.uid(),
  created_at       timestamptz not null default now(),
  check ((person_id is not null)::int + (family_id is not null)::int = 1)
);

create index notes_person_idx on public.notes_and_sources (person_id);
create index notes_family_idx on public.notes_and_sources (family_id);


-- ---------------------------------------------------------------------
-- PROFILES  (extra info about each login account; Supabase keeps the login itself)
-- ---------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  display_name     text,
  home_person_id   uuid references public.people (id),          -- "who am I" in the tree
  created_at       timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- TREE LINKS  (which accounts have which people in their tree)
-- ---------------------------------------------------------------------
create table public.tree_links (
  account_id       uuid not null references auth.users (id) on delete cascade,
  person_id        uuid not null references public.people (id),
  link_type        text not null check (link_type in ('created', 'connected')),
  created_at       timestamptz not null default now(),
  primary key (account_id, person_id)
);

create index tree_links_person_idx on public.tree_links (person_id);


-- ---------------------------------------------------------------------
-- REQUESTS AND SUGGESTIONS  (edits, new relationships, merges, connection requests)
-- ---------------------------------------------------------------------
create table public.requests_and_suggestions (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in ('edit_field', 'add_relationship', 'merge', 'connection')),
  person_id        uuid references public.people (id),          -- the person it is about
  proposal         jsonb not null default '{}'::jsonb,          -- the details of what is proposed
  status           text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  proposed_by      uuid not null default auth.uid(),
  decided_by       uuid,
  decided_at       timestamptz,
  created_at       timestamptz not null default now()
);

create index requests_person_idx on public.requests_and_suggestions (person_id);
create index requests_status_idx on public.requests_and_suggestions (status);


-- ---------------------------------------------------------------------
-- CHANGE HISTORY  (filled in automatically; used for undo and disputes)
-- ---------------------------------------------------------------------
create table public.change_history (
  id               bigint generated always as identity primary key,
  table_name       text not null,
  record_id        uuid,
  action           text not null,
  changed_by       uuid,
  changed_at       timestamptz not null default now(),
  old_values       jsonb,
  new_values       jsonb
);

create index change_history_record_idx on public.change_history (table_name, record_id);

create function public.log_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.change_history (table_name, record_id, action, changed_by, old_values, new_values)
  values (
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', null)::uuid,
    lower(tg_op),
    auth.uid(),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger people_history          after insert or update or delete on public.people
  for each row execute function public.log_change();
create trigger families_history        after insert or update or delete on public.families
  for each row execute function public.log_change();
create trigger family_children_history after insert or update or delete on public.family_children
  for each row execute function public.log_change();


-- Keep "updated_at" current on People and Families.
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger people_touch   before update on public.people
  for each row execute function public.touch_updated_at();
create trigger families_touch before update on public.families
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------
-- LOCK EVERYTHING. Row-level security on, and no access rules yet.
-- Nothing is readable or writable from the app until we add rules.
-- ---------------------------------------------------------------------
alter table public.people                   enable row level security;
alter table public.families                 enable row level security;
alter table public.family_children          enable row level security;
alter table public.notes_and_sources        enable row level security;
alter table public.profiles                 enable row level security;
alter table public.tree_links               enable row level security;
alter table public.requests_and_suggestions enable row level security;
alter table public.change_history           enable row level security;