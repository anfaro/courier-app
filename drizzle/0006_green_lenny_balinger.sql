CREATE TABLE "visits" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"customer_id" varchar(7) NOT NULL,
	"user_id" varchar(7) NOT NULL,
	"user_name" varchar(256),
	"check_in_at" timestamp DEFAULT now(),
	"check_out_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visits_customer_idx" ON "visits" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "visits_user_idx" ON "visits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "visits_check_in_idx" ON "visits" USING btree ("check_in_at");