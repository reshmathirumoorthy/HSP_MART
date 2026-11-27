ALTER TABLE "products" ADD COLUMN "length_mm" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "breadth_mm" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "height_mm" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight_g" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "max_load_g" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "packing_kind" text DEFAULT 'item' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "orientation" text DEFAULT 'any' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fragile" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_dimensions_positive" CHECK (coalesce("products"."length_mm", 1) > 0 and coalesce("products"."breadth_mm", 1) > 0 and coalesce("products"."height_mm", 1) > 0 and coalesce("products"."weight_g", 1) > 0 and coalesce("products"."max_load_g", 1) > 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_hamper_box_complete" CHECK ("products"."packing_kind" <> 'hamper_box' or ("products"."length_mm" is not null and "products"."breadth_mm" is not null and "products"."height_mm" is not null and "products"."max_load_g" is not null));