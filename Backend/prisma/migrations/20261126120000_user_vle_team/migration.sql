ALTER TABLE `users`
  ADD COLUMN `parent_user_id` BIGINT UNSIGNED NULL AFTER `role`,
  ADD INDEX `users_parent_user_id_idx` (`parent_user_id`);
