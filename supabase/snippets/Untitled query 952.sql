SELECT d.id, d.title, d.project_id, p.name as project_name
FROM public.deliverables d
LEFT JOIN public.projects p ON d.project_id = p.id
WHERE d.id = 'd0000000-0000-4000-8000-000000000002';