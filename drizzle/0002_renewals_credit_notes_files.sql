CREATE TABLE "account_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"reference" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"renewal_commission_bps" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"ended_reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"order_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"lines" jsonb NOT NULL,
	"taxable_paise" bigint NOT NULL,
	"gst_paise" bigint NOT NULL,
	"total_paise" bigint NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"refund_paise" bigint DEFAULT 0 NOT NULL,
	"refund_status" text DEFAULT 'none' NOT NULL,
	"provider_refund_id" text,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_notes_number_unique" UNIQUE("number"),
	CONSTRAINT "credit_notes_provider_refund_id_unique" UNIQUE("provider_refund_id")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"storage_key" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"review_status" text,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "provider_ref" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_lines" ADD COLUMN "credited_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_lines" ADD COLUMN "personalisation" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "source" text DEFAULT 'quote' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "freight_paise" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_address" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "client_ref" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "credited_paise" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "credited_taxable_paise" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "account_contracts" ADD CONSTRAINT "account_contracts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_contracts" ADD CONSTRAINT "account_contracts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_contracts" ADD CONSTRAINT "account_contracts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_contracts_customer_idx" ON "account_contracts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "credit_notes_order_idx" ON "credit_notes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "files_entity_idx" ON "files" USING btree ("entity","entity_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_ref_unique" UNIQUE("client_ref");