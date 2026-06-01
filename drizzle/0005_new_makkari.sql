CREATE TABLE "customer_visits" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"customer_id" varchar(7) NOT NULL,
	"user_id" varchar(7),
	"user_name" varchar(256),
	"visited_at" timestamp DEFAULT now() NOT NULL,
	"checked_out_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "incomings" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"session_id" varchar(7) NOT NULL,
	"time" timestamp DEFAULT now() NOT NULL,
	"packages" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_routes" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"user_id" varchar(7) NOT NULL,
	"name" varchar(256) NOT NULL,
	"customer_ids" text NOT NULL,
	"start_lat" varchar(32),
	"start_lng" varchar(32),
	"end_lat" varchar(32),
	"end_lng" varchar(32),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_deliveries" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"session_id" varchar(7) NOT NULL,
	"incoming_id" varchar(7) NOT NULL,
	"customer_id" varchar(7) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"user_id" varchar(7) NOT NULL,
	"date" varchar(10) NOT NULL,
	"total_packages" varchar(10) DEFAULT '0' NOT NULL,
	"delivered_packages" varchar(10) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trips" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "visits" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "trips" CASCADE;--> statement-breakpoint
DROP TABLE "visits" CASCADE;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "share_token" varchar(16);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "share_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomings" ADD CONSTRAINT "incomings_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_routes" ADD CONSTRAINT "saved_routes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_deliveries" ADD CONSTRAINT "session_deliveries_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_deliveries" ADD CONSTRAINT "session_deliveries_incoming_id_incomings_id_fk" FOREIGN KEY ("incoming_id") REFERENCES "public"."incomings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_deliveries" ADD CONSTRAINT "session_deliveries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visits_customer_id_idx" ON "customer_visits" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "visits_visited_at_idx" ON "customer_visits" USING btree ("visited_at");--> statement-breakpoint
CREATE INDEX "incomings_session_id_idx" ON "incomings" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "deliveries_session_id_idx" ON "session_deliveries" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "deliveries_status_idx" ON "session_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_user_id_date_idx" ON "sessions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "customers_share_token_idx" ON "customers" USING btree ("share_token");