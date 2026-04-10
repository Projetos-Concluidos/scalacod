ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_status_check;

ALTER TABLE public.conversations
ADD CONSTRAINT conversations_status_check
CHECK (
  status IS NULL
  OR status = ANY (
    ARRAY[
      'open'::text,
      'resolved'::text,
      'archived'::text,
      'closed'::text,
      'waiting'::text
    ]
  )
);