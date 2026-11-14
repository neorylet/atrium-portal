UPDATE public.deliverables
SET approved_at = NULL
WHERE status <> 'approved' AND approved_at IS NOT NULL;