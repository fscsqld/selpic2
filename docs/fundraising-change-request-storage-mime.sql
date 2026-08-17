-- Allow partner change-request attachments (D22 filled PDFs / scans / Word)
-- on the public selpic-contents bucket (previously image/* + video/* only).
-- Run in Supabase SQL Editor if API updateBucket is not used.

update storage.buckets
set allowed_mime_types = array[
  'image/*',
  'video/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
where id = 'selpic-contents';
