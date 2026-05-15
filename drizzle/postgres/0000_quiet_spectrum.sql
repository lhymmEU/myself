CREATE TABLE "agent_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb,
	"blob_path" text,
	"source_ref" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL,
	"processed_at" bigint,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "agent_registrations" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"token_jti" text NOT NULL,
	"created_at" bigint NOT NULL,
	"last_seen_at" bigint
);
--> statement-breakpoint
CREATE TABLE "claw_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"host" text NOT NULL,
	"port" integer DEFAULT 22 NOT NULL,
	"username" text NOT NULL,
	"auth_method" text NOT NULL,
	"password" text,
	"private_key" text,
	"passphrase" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_appearance" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"character_type" text NOT NULL,
	"skin_color" text,
	"hair_color" text,
	"shirt_color" text,
	"pants_color" text,
	"shoe_color" text,
	"shell_color" text,
	"shell_dark_color" text,
	"belly_color" text,
	"eye_color" text
);
--> statement-breakpoint
CREATE TABLE "skill_wishlist" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_level" text DEFAULT 'familiar' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"notes" text DEFAULT '',
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"level" text DEFAULT 'familiar' NOT NULL,
	"category" text DEFAULT '',
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_wishes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"user_description" text NOT NULL,
	"plan_data" text DEFAULT '{}' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_todos" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"wish_id" text NOT NULL,
	"content" text NOT NULL,
	"completed" bigint DEFAULT 0 NOT NULL,
	"sort_order" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'checking' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"balance" double precision DEFAULT 0 NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"icon" text DEFAULT 'wallet' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"monthly_limit" double precision DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_investments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"symbol" text NOT NULL,
	"shares" double precision DEFAULT 0 NOT NULL,
	"avg_cost_basis" double precision DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"type" text DEFAULT 'expense' NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"date" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"recurring" bigint DEFAULT 0 NOT NULL,
	"recurring_interval" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "life_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"parent_id" text,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"position_x" double precision DEFAULT 0 NOT NULL,
	"position_y" double precision DEFAULT 0 NOT NULL,
	"connections" text DEFAULT '[]' NOT NULL,
	"metadata" text DEFAULT '{}' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mind_map_scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text DEFAULT 'Untitled' NOT NULL,
	"elements" text DEFAULT '[]' NOT NULL,
	"app_state" text DEFAULT '{}' NOT NULL,
	"files" text DEFAULT '{}' NOT NULL,
	"mode" text DEFAULT 'mind' NOT NULL,
	"is_todo_source" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pm_demands" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'demand' NOT NULL,
	"status" text DEFAULT 'unvalidated' NOT NULL,
	"evidence" text DEFAULT '' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pm_features" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pm_stakeholders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"role_color" text DEFAULT '#8b5cf6' NOT NULL,
	"details" text DEFAULT '{}' NOT NULL,
	"claw_notes" text DEFAULT '' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pm_user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT '' NOT NULL,
	"type_color" text DEFAULT '#3b82f6' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"completed" bigint DEFAULT 0 NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"due_date" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"linked_node_id" text,
	"llm_reasoning" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_marked_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" text NOT NULL,
	"marked_item_id" text NOT NULL,
	"sort_order" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '{}' NOT NULL,
	"linked_node_id" text,
	"folder_id" text,
	"sort_order" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "settings_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "invoice_clients" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"company" text,
	"notes" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"description" text NOT NULL,
	"rate" double precision DEFAULT 0 NOT NULL,
	"quantity" double precision DEFAULT 1 NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"sort_order" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_signatures" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"data_url" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"client_id" text,
	"date" text NOT NULL,
	"due_date" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"sender_name" text,
	"sender_email" text,
	"sender_phone" text,
	"payment_info" text,
	"signature_id" text,
	"notes" text,
	"subtotal" double precision DEFAULT 0 NOT NULL,
	"tax" double precision DEFAULT 0 NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "marked_collections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"slug" text,
	"sort_order" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "marked_collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "marked_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"source_tag" text,
	"notes" text,
	"favicon" text,
	"og_image" text,
	"og_description" text,
	"collection_id" text,
	"sort_order" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_meta" (
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "vault_meta_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "vault_secrets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"encrypted_value" text NOT NULL,
	"nonce" text NOT NULL,
	"encrypted_notes" text,
	"notes_nonce" text,
	"tags" text DEFAULT '[]' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_dismissals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" text NOT NULL,
	"verb" text NOT NULL,
	"payload_json" text DEFAULT '',
	"created_at" bigint NOT NULL,
	"ingested" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pinned_queries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"question" text NOT NULL,
	"wiki_slug" text,
	"last_answer_at" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_ingest_state" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"generative_cards_json" text,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finance_investments" ADD CONSTRAINT "finance_investments_account_id_finance_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_account_id_finance_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_invoice_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."invoice_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_signature_id_invoice_signatures_id_fk" FOREIGN KEY ("signature_id") REFERENCES "public"."invoice_signatures"("id") ON DELETE no action ON UPDATE no action;