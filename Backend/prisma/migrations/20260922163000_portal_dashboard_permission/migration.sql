-- Remove mistaken home-dashboard permission if this migration ran earlier.
DELETE rp FROM `portal_role_permissions` rp
INNER JOIN `portal_permissions` p ON p.`id` = rp.`permission_id`
WHERE p.`key` = 'portal.account.dashboard';

DELETE FROM `portal_permissions` WHERE `key` = 'portal.account.dashboard';

-- SSL AMC module dashboards (Roles & Access — paired with SSL AMC view).
INSERT INTO `portal_permissions` (`key`, `label`, `module`, `description`)
VALUES
  (
    'portal.bihar.ssl_amc.dashboard',
    'Bihar SSL AMC — dashboard',
    'bihar_amc',
    'View Bihar SSL AMC dashboard (granted automatically with view access).'
  ),
  (
    'portal.up.ssl_amc.dashboard',
    'UP SSL AMC — dashboard',
    'up_amc',
    'View UP SSL AMC dashboard (granted automatically with view access).'
  )
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `module` = VALUES(`module`),
  `description` = VALUES(`description`);

INSERT IGNORE INTO `portal_role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `portal_roles` r
INNER JOIN `portal_role_permissions` rp ON rp.`role_id` = r.`id`
INNER JOIN `portal_permissions` read_p ON read_p.`id` = rp.`permission_id`
INNER JOIN `portal_permissions` p ON p.`key` = 'portal.bihar.ssl_amc.dashboard'
WHERE read_p.`key` = 'portal.bihar.ssl_amc.read';

INSERT IGNORE INTO `portal_role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `portal_roles` r
INNER JOIN `portal_role_permissions` rp ON rp.`role_id` = r.`id`
INNER JOIN `portal_permissions` read_p ON read_p.`id` = rp.`permission_id`
INNER JOIN `portal_permissions` p ON p.`key` = 'portal.up.ssl_amc.dashboard'
WHERE read_p.`key` = 'portal.up.ssl_amc.read';
