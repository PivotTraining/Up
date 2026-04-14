-- Haven MVP Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create category enum
create type note_category as enum ('faith', 'academic', 'training', 'leadership', 'health');
create type purchase_status as enum ('pending', 'completed', 'refunded');

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  organization text,
  bio text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Notes table
create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  author_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text not null,
  category note_category not null,
  price integer not null default 0, -- in cents
  is_paid boolean not null default false,
  file_path text not null,
  file_name text not null,
  file_size integer not null,
  views integer not null default 0,
  downloads integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Purchases table
create table public.purchases (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  note_id uuid references public.notes on delete cascade not null,
  stripe_payment_intent_id text not null unique,
  amount_paid integer not null, -- in cents
  status purchase_status not null default 'pending',
  created_at timestamptz default now() not null,
  unique(user_id, note_id)
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Atomic view increment
create or replace function public.increment_views(note_id uuid)
returns void as $$
  update public.notes set views = views + 1 where id = note_id;
$$ language sql security definer;

-- Atomic download increment
create or replace function public.increment_downloads(note_id uuid)
returns void as $$
  update public.notes set downloads = downloads + 1 where id = note_id;
$$ language sql security definer;

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger notes_updated_at
  before update on public.notes
  for each row execute procedure public.handle_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.purchases enable row level security;

-- Profiles RLS
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Notes RLS
create policy "Published notes viewable by everyone"
  on public.notes for select using (is_published = true or author_id = auth.uid());

create policy "Authors can insert notes"
  on public.notes for insert with check (auth.uid() = author_id);

create policy "Authors can update own notes"
  on public.notes for update using (auth.uid() = author_id);

create policy "Authors can delete own notes"
  on public.notes for delete using (auth.uid() = author_id);

-- Purchases RLS
create policy "Users can view own purchases"
  on public.purchases for select using (auth.uid() = user_id);

create policy "Service role can insert purchases"
  on public.purchases for insert with check (true);

-- Storage bucket (run after creating bucket in dashboard)
-- Bucket name: haven-files
-- Set to private
-- Allowed MIME types: application/pdf, application/msword,
--   application/vnd.openxmlformats-officedocument.wordprocessingml.document,
--   image/jpeg, image/png
-- Max file size: 20971520 (20MB)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'haven-files',
  'haven-files',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
) on conflict do nothing;

-- Storage RLS (service role bypasses these via service key)
create policy "Service role manages files"
  on storage.objects for all using (bucket_id = 'haven-files');
