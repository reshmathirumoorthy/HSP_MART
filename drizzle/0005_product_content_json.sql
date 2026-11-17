ALTER TABLE "products" ALTER COLUMN "content" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "content" SET DEFAULT '{}'::json;