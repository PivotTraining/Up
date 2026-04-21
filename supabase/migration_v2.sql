-- Haven v2 Migration
-- Run this in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/gkhszwmbmeehablwzoyw/sql/new

-- 1. Add new columns to notes
alter table public.notes
  add column if not exists tags text[] default '{}',
  add column if not exists presenter text,
  add column if not exists location text,
  add column if not exists youtube_url text,
  add column if not exists rating_avg numeric(3,2) default 0,
  add column if not exists rating_count integer default 0;

-- 2. Make file_path/file_name nullable (for quick text-only notes)
alter table public.notes
  alter column file_path drop not null,
  alter column file_name drop not null;

-- 3. Ratings table
create table if not exists public.ratings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  note_id uuid references public.notes on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz default now() not null,
  unique(user_id, note_id)
);

alter table public.ratings enable row level security;

create policy "Anyone can view ratings"
  on public.ratings for select using (true);

create policy "Authenticated users can insert ratings"
  on public.ratings for insert with check (auth.uid() = user_id);

create policy "Users can update own ratings"
  on public.ratings for update using (auth.uid() = user_id);

-- 4. Auto-update rating avg/count on notes
create or replace function public.update_note_rating()
returns trigger as $$
begin
  update public.notes
  set
    rating_avg = (
      select round(avg(rating)::numeric, 2)
      from public.ratings
      where note_id = coalesce(new.note_id, old.note_id)
    ),
    rating_count = (
      select count(*)
      from public.ratings
      where note_id = coalesce(new.note_id, old.note_id)
    )
  where id = coalesce(new.note_id, old.note_id);
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

drop trigger if exists ratings_updated on public.ratings;
create trigger ratings_updated
  after insert or update or delete on public.ratings
  for each row execute procedure public.update_note_rating();

-- 5. Indexes
create index if not exists notes_tags_gin on public.notes using gin(tags);
create index if not exists notes_presenter_idx on public.notes (presenter);
create index if not exists notes_location_idx on public.notes (location);
