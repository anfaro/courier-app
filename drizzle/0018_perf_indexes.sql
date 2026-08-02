CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "customer_clusters_cluster_id_idx" ON "customer_clusters" ("cluster_id");

CREATE INDEX IF NOT EXISTS "visits_customer_visited_idx" ON "customer_visits" ("customer_id", "visited_at" DESC);

CREATE INDEX IF NOT EXISTS "customers_name_trgm_idx" ON "customers" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "customers_address_trgm_idx" ON "customers" USING gin ("address" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "customers_phone_trgm_idx" ON "customers" USING gin ("phone_number" gin_trgm_ops);
