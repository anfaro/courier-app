CREATE TABLE "access_logs" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"user_id" varchar(7),
	"user_name" varchar(256),
	"pathname" varchar(2048) NOT NULL,
	"method" varchar(10) NOT NULL,
	"ip_address" varchar(100),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clusters" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_clusters" (
	"customer_id" varchar(7) NOT NULL,
	"cluster_id" varchar(7) NOT NULL,
	CONSTRAINT "customer_clusters_customer_id_cluster_id_pk" PRIMARY KEY("customer_id","cluster_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"phone_number" varchar(50),
	"address" text NOT NULL,
	"latitude" text,
	"longitude" text,
	"house_picture_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"waybill_number" varchar(256) NOT NULL,
	"customer_id" varchar(7),
	"proof_of_delivery_url" text,
	"status" varchar(50) DEFAULT 'Pending',
	"cod_amount" text DEFAULT '0',
	"receiver_name" varchar(256),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "deliveries_waybill_number_unique" UNIQUE("waybill_number")
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"user_id" varchar(7),
	"user_name" varchar(256),
	"error_name" varchar(256),
	"error_message" text,
	"stack_trace" text,
	"pathname" varchar(2048),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"user_id" varchar(7),
	"user_name" varchar(256),
	"action" varchar(100) NOT NULL,
	"details" text,
	"target_id" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar(7) PRIMARY KEY NOT NULL,
	"email" varchar(256) NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE varchar(7);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(50) DEFAULT 'courier' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_clusters" ADD CONSTRAINT "customer_clusters_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_clusters" ADD CONSTRAINT "customer_clusters_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;