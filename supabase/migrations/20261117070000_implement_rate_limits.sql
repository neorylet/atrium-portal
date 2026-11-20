-- Per-bucket upload quotas. The global file_size_limit in config.toml is 50 MiB,
-- so these lower bucket-level limits are the ones Storage enforces on upload.
update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/zip'
  ]
where
  id in ('deliverable-files', 'uploads');

-- Supports the rolling one-minute count performed by the trigger below.
create index if not exists idx_comments_created_by_created_at
  on supasheet.comments (created_by, created_at desc);

-- Serialize concurrent inserts for the same user so a burst of parallel
-- requests cannot all observe the same sub-threshold count.
create or replace function supasheet.check_comment_rate_limit ()
returns trigger
language plpgsql
security definer
set search_path = '' as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock (
    hashtext('supasheet.comments.rate_limit'),
    hashtext(auth.uid ()::text)
  );

  select count(*) into v_count
  from supasheet.comments
  where
    created_by = auth.uid ()
    and created_at > now () - interval '1 minute';

  if v_count >= 5 then
    raise exception 'Rate limit exceeded: You can only post 5 comments per minute.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_comment_rate_limit on supasheet.comments;

create trigger trg_check_comment_rate_limit
before insert on supasheet.comments
for each row execute function supasheet.check_comment_rate_limit ();

select supasheet.refresh_metadata();
