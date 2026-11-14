SELECT n.title, n.body, un.user_id 
FROM supasheet.notifications n
JOIN supasheet.user_notifications un ON un.notification_id = n.id
ORDER BY n.created_at DESC LIMIT 5;