CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "embedding" vector(1024);--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "provider_shipment_id" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "tracking_status" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "tracking_checked_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_name_trgm_idx" ON "products" USING gin ("name" gin_trgm_ops);
