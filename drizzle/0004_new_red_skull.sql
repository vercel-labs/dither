ALTER TABLE "dithers" ADD COLUMN "threshold" text DEFAULT '255' NOT NULL;--> statement-breakpoint
ALTER TABLE "dithers" ADD COLUMN "contrast" text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "dithers" ADD COLUMN "brightness" text DEFAULT '-100' NOT NULL;