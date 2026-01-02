ALTER TABLE "dithers" ADD COLUMN "model_id" text;--> statement-breakpoint
ALTER TABLE "dithers" ADD COLUMN "status" text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "dithers" ADD COLUMN "error_message" text;