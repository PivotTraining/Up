-- Haven v3: Organizations / Workspaces
-- Run in Supabase Dashboard → SQL Editor

create type org_type as enum ('church', 'school', 'conference', 'other');
create type org_plan as enum ('starter', 'growth', 'enterprise');
create type member_role as enum ('admin', 'contributor', 'viewer');

-- Organizations table
create table if not exists public.organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  type org_type not null default 'church',
  logo_url text,
  accent_color text default '#1a3a2a',
  plan org_plan not null default 'starter',
  member_limit integer not null default 50,
  stripe_subscription_id text,
  stripe_customer_id text,
  is_active boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Organization members
create table if not exists public.organization_members (
  id uuid default uuid_generate_v4() primary key,
  org_id uuid references public.organizations on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role member_role not null default 'viewer',
  invited_by uuid references auth.users,
  joined_at timestamptz default now() not null,
  unique(org_id, user_id)
);

-- Add org_id to notes (null = public marketplace, set = org-private)
alter table public.notes
  add column if not exists org_id uuid references public.organizations on delete cascade;

-- Organization invites
create table if not exists public.org_invites (
  id uuid default uuid_generate_v4() primary key,
  org_id uuid references public.organizations on delete cascade not null,
  email text not null,
  role member_role not null default 'viewer',
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references auth.users not null,
  accepted_at timestamptz,
  expires_at timestamptz default now() + interval '7 days',
  created_at timestamptz default now() not null
);

-- RLS
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.org_invites enable row level security;

-- Orgs: visible to members
create policy "Org members can view their org"
  on public.organizations for select
  using (
    exists (
      select 1 from public.organization_members
      where org_id = organizations.id and user_id = auth.uid()
    )
  );

create policy "Org admins can update their org"
  on public.organizations for update
  using (
    exists (
      select 1 from public.organization_members
      where org_id = organizations.id and user_id = auth.uid() and role = 'admin'
    )
  );

-- Members: visible to org members
create policy "Org members can view membership"
  on public.organization_members for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.org_id = organization_members.org_id and om.user_id = auth.uid()
    )
  );

-- Notes: org notes visible only to members
drop policy if exists "Published notes viewable by everyone" on public.notes;
create policy "Notes viewable by appropriate audience"
  on public.notes for select
  using (
    (is_published = true and org_id is null)  -- public notes
    or author_id = auth.uid()                  -- your own notes
    or (
      org_id is not null and exists (          -- org-private notes: members only
        select 1 from public.organization_members
        where org_id = notes.org_id and user_id = auth.uid()
      )
    )
  );

-- Indexes
create index if not exists org_members_user_idx on public.organization_members (user_id);
create index if not exists org_members_org_idx on public.organization_members (org_id);
create index if not exists notes_org_idx on public.notes (org_id);
create index if not exists org_invites_token_idx on public.org_invites (token);

-- Updated_at trigger for orgs
create trigger orgs_updated_at
  before update on public.organizations
  for each row execute procedure public.handle_updated_at();

-- Helper: get user's organizations
create or replace function public.get_user_orgs(uid uuid)
returns table(org_id uuid, org_name text, role member_role) as $$
  select o.id, o.name, om.role
  from public.organizations o
  join public.organization_members om on om.org_id = o.id
  where om.user_id = uid and o.is_active = true;
$$ language sql security definer;
