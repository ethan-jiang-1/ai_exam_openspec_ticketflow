INSERT OR IGNORE INTO ticket_history (id, ticket_id, action, actor, from_status, to_status, details, created_at)
SELECT lower(hex(randomblob(16))), id, 'created', created_by, NULL, 'submitted', NULL, created_at
FROM tickets
