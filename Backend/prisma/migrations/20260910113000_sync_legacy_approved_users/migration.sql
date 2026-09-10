-- Legacy approved users had status=1 before approval_status column existed.
UPDATE `users`
SET `approval_status` = 1
WHERE `status` = 1 AND (`approval_status` IS NULL OR `approval_status` = 0);
