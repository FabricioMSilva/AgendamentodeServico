insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'logos',
    'logos',
    true,
    524288,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'establishment-media',
    'establishment-media',
    true,
    1048576,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
