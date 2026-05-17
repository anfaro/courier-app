CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "deliveries_created_at_idx" ON "deliveries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "deliveries_customer_id_idx" ON "deliveries" USING btree ("customer_id");