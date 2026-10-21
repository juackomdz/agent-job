CREATE TABLE `cv_profiles` (
	`id` text PRIMARY KEY,
	`created_at` integer NOT NULL,
	`full_name` text,
	`email` text,
	`headline` text,
	`location` text,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cv_skills` (
	`id` text,
	`profile_id` text NOT NULL,
	`skill` text NOT NULL,
	CONSTRAINT `cv_skills_pk` PRIMARY KEY(`profile_id`, `skill`),
	CONSTRAINT `fk_cv_skills_profile_id_cv_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `cv_profiles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `offers` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text(100) NOT NULL,
	`description` text NOT NULL,
	`company` text NOT NULL,
	`match` integer,
	`url` text NOT NULL UNIQUE,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cv_skills_skill_idx` ON `cv_skills` (`skill`);