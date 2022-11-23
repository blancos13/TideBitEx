-- create audit_account_records table to store audit account records
CREATE TABLE IF NOT EXISTS `audit_account_records` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
    `account_id` int(11) DEFAULT NULL,
    `member_id` int(11) DEFAULT NULL,
	`currency` int(11) DEFAULT NULL,
    `account_version_id_start` int(11) DEFAULT NULL,
    `account_version_id_end` int(11) DEFAULT NULL,
	`balance` decimal (32, 16) DEFAULT NULL,
	`expect_balance` decimal (32, 16) DEFAULT NULL,
	`locked` decimal (32, 16) DEFAULT NULL,
	`expect_locked` decimal (32, 16) DEFAULT NULL,
    `created_at` datetime DEFAULT NULL,
    `updated_at` datetime DEFAULT NULL,
    `fixed_at` datetime DEFAULT NULL,
	`issued_by` varchar(255) DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = latin1;