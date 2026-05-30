CREATE TABLE "trips" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"user_id" varchar(7) NOT NULL,
	"user_name" varchar(256),
	"customer_ids" text NOT NULL,
	"start_lat" text,
	"start_lng" text,
	"start_address" text,
	"total_distance" text,
	"total_duration" text,
	"route_geometry" text,
	"stop_count" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trips_user_idx" ON "trips" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trips_created_at_idx" ON "trips" USING btree ("created_at");