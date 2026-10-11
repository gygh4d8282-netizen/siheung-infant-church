-- 파일 삭제가 일시적으로 실패해도 다음 관리 작업에서 재시도합니다.
create table public.storage_deletions(id uuid primary key default gen_random_uuid(),bucket text not null,path text not null,created_at timestamptz not null default now(),unique(bucket,path));
alter table public.storage_deletions enable row level security;
revoke all on public.storage_deletions from anon,authenticated;
grant all on public.storage_deletions to service_role;
create function public.queue_asset_delete() returns trigger language plpgsql security definer set search_path=public as $$ begin
 insert into storage_deletions(bucket,path) values(old.bucket,old.path) on conflict do nothing;
 if old.thumb_path is not null then insert into storage_deletions(bucket,path) values(old.bucket,old.thumb_path) on conflict do nothing;end if;
 return old;
end $$;
create trigger queue_asset_delete before delete on public.assets for each row execute function public.queue_asset_delete();
create function public.queue_entry_delete() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if new.deleted_at is not null and old.deleted_at is null then delete from assets where entry_id=new.id;end if;return new;
end $$;
create trigger queue_entry_delete after update on public.entries for each row execute function public.queue_entry_delete();
revoke execute on function public.queue_asset_delete(),public.queue_entry_delete() from public,anon,authenticated;
grant execute on function public.queue_asset_delete(),public.queue_entry_delete() to service_role;
