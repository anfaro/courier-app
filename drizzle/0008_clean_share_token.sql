ALTER TABLE "customers" ADD COLUMN "share_token" varchar(16);--> statement-breakpoint
CREATE INDEX "customers_share_token_idx" ON "customers" USING btree ("share_token");
