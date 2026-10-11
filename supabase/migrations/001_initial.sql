-- Supabase SQL Editor에서 한 번 실행합니다. 비밀값이나 실제 콘텐츠는 포함하지 않습니다.
create extension if not exists pgcrypto;
create table public.administrators(user_id uuid primary key references auth.users(id) on delete cascade, active boolean not null default true);
create table public.site_settings(id boolean primary key default true check(id), data jsonb not null default '{}'::jsonb, version integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id));
insert into public.site_settings(id) values(true);
create table public.access_settings(space text primary key check(space in ('teachers','albums')), password_hash text not null, password_fingerprint text unique, version integer not null default 1, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id));
create table public.entries(
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('news','family','teachers','event','album')),title text not null,body text not null default '',summary text not null default '',category text not null default '',activity_date date,start_at timestamptz,end_at timestamptz,all_day boolean not null default false,location text not null default '',audience text not null check(audience in ('public','teachers','albums')),important boolean not null default false,youtube text not null default '',status text not null default 'draft' check(status in ('draft','published')),version integer not null default 1,cover_id uuid,published_at timestamptz,reviewed_by uuid references auth.users(id),reviewed_at timestamptz,created_by uuid references auth.users(id),updated_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz,
 check ((kind in ('news','family') and audience='public') or (kind='teachers' and audience='teachers') or (kind='album' and audience='albums') or (kind='event' and audience in ('public','teachers'))),
 check(kind<>'event' or (start_at is not null and end_at>=start_at)),check(kind not in ('teachers','album') or activity_date is not null),check(status<>'published' or kind not in ('family','teachers','album') or (reviewed_by is not null and reviewed_at is not null))
);
create index entries_listing on public.entries(kind,status,audience,activity_date desc) where deleted_at is null;
create table public.assets(id uuid primary key default gen_random_uuid(),entry_id uuid not null references public.entries(id) on delete cascade,name text not null,alt text not null default '',position integer not null default 0,mime text not null,size integer not null,is_photo boolean not null default false,bucket text not null check(bucket in ('public-materials','teacher-materials','album-photos')),path text not null,thumb_path text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),created_by uuid references auth.users(id),updated_by uuid references auth.users(id));
create index assets_parent on public.assets(entry_id);
create table public.upload_intents(id uuid primary key default gen_random_uuid(),entry_id uuid not null references public.entries(id),version integer not null,owner_id uuid not null references auth.users(id),name text not null,alt text not null default '',size integer not null,path text not null unique,created_at timestamptz not null default now());
create table public.attempt_limits(key text primary key,started_at timestamptz not null default now(),attempts integer not null default 1);
-- 브라우저 직접 접근은 차단합니다. 관리자 권한을 확인한 서버만 service_role을 사용합니다.
alter table public.administrators enable row level security;
alter table public.site_settings enable row level security;
alter table public.access_settings enable row level security;
alter table public.entries enable row level security;
alter table public.assets enable row level security;
alter table public.upload_intents enable row level security;
alter table public.attempt_limits enable row level security;
revoke all on public.administrators,public.site_settings,public.access_settings,public.entries,public.assets,public.upload_intents,public.attempt_limits from anon,authenticated;
grant all on public.administrators,public.site_settings,public.access_settings,public.entries,public.assets,public.upload_intents,public.attempt_limits to service_role;
-- 모든 버킷은 비공개입니다. 공개 자료도 서버에서 게시 여부를 확인합니다.
insert into storage.buckets(id,name,public,file_size_limit) values('public-materials','public-materials',false,20971520),('teacher-materials','teacher-materials',false,20971520),('album-photos','album-photos',false,10485760),('upload-quarantine','upload-quarantine',false,20971520);
create function public.consume_attempt(p_key text,p_limit integer) returns boolean language plpgsql security definer set search_path=public as $$
declare count integer;
begin
 delete from attempt_limits where started_at<now()-interval '1 day';
 insert into attempt_limits(key) values(p_key) on conflict(key) do update set attempts=case when attempt_limits.started_at<now()-interval '15 minutes' then 1 else attempt_limits.attempts+1 end,started_at=case when attempt_limits.started_at<now()-interval '15 minutes' then now() else attempt_limits.started_at end returning attempts into count;
 return count<=p_limit;
end $$;
create function public.assert_admin(p_actor uuid) returns void language plpgsql security definer set search_path=public as $$ begin if not exists(select 1 from administrators where user_id=p_actor and active) then raise exception 'UNAUTHORIZED';end if;end $$;
create function public.save_entry(p_data jsonb,p_actor uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare old entries; item entries; item_id uuid; expected integer;
begin
 perform assert_admin(p_actor);
 item_id=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());expected=(p_data->>'version')::integer;
 select * into old from entries where id=item_id for update;
 if found then
  if old.deleted_at is not null or old.version<>expected then raise exception 'CONFLICT';end if;
  if old.kind<>p_data->>'kind' then raise exception 'INVALID_KIND';end if;
 elsif expected<>0 then raise exception 'CONFLICT';end if;
 if p_data->>'status'='published' and p_data->>'kind' in ('family','teachers','album') and coalesce((p_data->>'reviewed')::boolean,false)=false then raise exception 'REVIEW_REQUIRED';end if;
 if p_data->>'status'='published' and p_data->>'kind'='album' and not exists(select 1 from assets where entry_id=item_id and is_photo) then raise exception 'PHOTO_REQUIRED';end if;
 if nullif(p_data->>'cover_id','') is not null and not exists(select 1 from assets where id=(p_data->>'cover_id')::uuid and entry_id=item_id and is_photo) then raise exception 'INVALID_COVER';end if;
 item=jsonb_populate_record(null::entries,p_data);
 insert into entries(id,kind,title,body,summary,category,activity_date,start_at,end_at,all_day,location,audience,important,youtube,status,cover_id,published_at,reviewed_by,reviewed_at,created_by,updated_by)
 values(item_id,item.kind,item.title,item.body,item.summary,item.category,item.activity_date,item.start_at,item.end_at,item.all_day,item.location,item.audience,item.important,item.youtube,item.status,item.cover_id,case when item.status='published' then now() end,case when item.status='published' and item.kind in ('family','teachers','album') then p_actor end,case when item.status='published' and item.kind in ('family','teachers','album') then now() end,p_actor,p_actor)
 on conflict(id) do update set title=excluded.title,body=excluded.body,summary=excluded.summary,category=excluded.category,activity_date=excluded.activity_date,start_at=excluded.start_at,end_at=excluded.end_at,all_day=excluded.all_day,location=excluded.location,audience=excluded.audience,important=excluded.important,youtube=excluded.youtube,status=excluded.status,cover_id=excluded.cover_id,published_at=case when excluded.status='published' then coalesce(entries.published_at,now()) else null end,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at,updated_by=p_actor,updated_at=now(),version=entries.version+1;
 return item_id;
end $$;
create function public.delete_entry(p_id uuid,p_version integer,p_actor uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 perform assert_admin(p_actor);update entries set deleted_at=now(),status='draft',version=version+1,updated_by=p_actor,updated_at=now() where id=p_id and version=p_version and deleted_at is null;if not found then raise exception 'CONFLICT';end if;
end $$;
create function public.save_settings(p_data jsonb,p_version integer,p_actor uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 perform assert_admin(p_actor);update site_settings set data=p_data,version=version+1,updated_at=now(),created_by=coalesce(created_by,p_actor),updated_by=p_actor where id and version=p_version;if not found then raise exception 'CONFLICT';end if;
end $$;
create function public.rotate_password(p_space text,p_hash text,p_actor uuid,p_fingerprint text default null) returns void language plpgsql security definer set search_path=public as $$ begin
 perform assert_admin(p_actor);insert into access_settings(space,password_hash,updated_by,password_fingerprint) values(p_space,p_hash,p_actor,p_fingerprint) on conflict(space) do update set password_hash=p_hash,password_fingerprint=p_fingerprint,version=access_settings.version+1,updated_at=now(),updated_by=p_actor;
end $$;
create function public.attach_asset(p_intent uuid,p_asset jsonb,p_actor uuid) returns void language plpgsql security definer set search_path=public as $$
declare intent upload_intents;parent entries;
begin
 perform assert_admin(p_actor);select * into intent from upload_intents where id=p_intent and owner_id=p_actor and created_at>now()-interval '1 hour' for update;if not found then raise exception 'INVALID_UPLOAD';end if;
 select * into parent from entries where id=intent.entry_id for update;if parent.deleted_at is not null or parent.version<>intent.version then raise exception 'CONFLICT';end if;
 insert into assets(id,entry_id,name,alt,position,mime,size,is_photo,bucket,path,thumb_path,created_by,updated_by) values((p_asset->>'id')::uuid,parent.id,coalesce(p_asset->>'name',intent.name),intent.alt,(select count(*) from assets where entry_id=parent.id),p_asset->>'mime',(p_asset->>'size')::integer,parent.kind='album',p_asset->>'bucket',p_asset->>'path',p_asset->>'thumb_path',p_actor,p_actor);
 update entries set version=version+1,status='draft',reviewed_by=null,reviewed_at=null,updated_at=now(),updated_by=p_actor where id=parent.id;
 delete from upload_intents where id=p_intent;
end $$;
create function public.edit_asset(p_id uuid,p_version integer,p_alt text,p_remove boolean,p_actor uuid) returns void language plpgsql security definer set search_path=public as $$
declare target assets;parent entries;
begin
 perform assert_admin(p_actor);select * into target from assets where id=p_id;if not found then raise exception 'NOT_FOUND';end if;
 select * into parent from entries where id=target.entry_id for update;if parent.deleted_at is not null or parent.version<>p_version then raise exception 'CONFLICT';end if;
 if p_remove then delete from assets where id=p_id;else update assets set alt=p_alt,updated_at=now(),updated_by=p_actor where id=p_id;end if;
 update entries set version=version+1,status='draft',reviewed_by=null,reviewed_at=null,cover_id=case when cover_id=p_id and p_remove then null else cover_id end,updated_at=now(),updated_by=p_actor where id=parent.id;
end $$;
revoke execute on function public.consume_attempt(text,integer),public.assert_admin(uuid),public.save_entry(jsonb,uuid),public.delete_entry(uuid,integer,uuid),public.save_settings(jsonb,integer,uuid),public.rotate_password(text,text,uuid,text),public.attach_asset(uuid,jsonb,uuid),public.edit_asset(uuid,integer,text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.consume_attempt(text,integer),public.assert_admin(uuid),public.save_entry(jsonb,uuid),public.delete_entry(uuid,integer,uuid),public.save_settings(jsonb,integer,uuid),public.rotate_password(text,text,uuid,text),public.attach_asset(uuid,jsonb,uuid),public.edit_asset(uuid,integer,text,boolean,uuid) to service_role;


