import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client);

  // First query warms up PGLite WASM (cold start ~10s)
  await client.exec("SELECT 1");
  await client.exec(SCHEMA_SQL);

  return { client, db };
}

export async function destroyTestDb(client: PGlite) {
  await client.exec(`DROP TABLE IF EXISTS
    saved_routes, session_deliveries, incomings, sessions,
    customer_visits, customer_clusters, error_logs, access_logs, logs,
    customers, clusters, password_reset_tokens, users CASCADE`);
  await client.close();
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id varchar(7) PRIMARY KEY,
  name varchar(256) NOT NULL,
  email varchar(256) NOT NULL UNIQUE,
  password text NOT NULL,
  role varchar(50) DEFAULT 'courier' NOT NULL,
  rate integer DEFAULT 1500 NOT NULL,
  target_system boolean DEFAULT true NOT NULL,
  get_geocode boolean DEFAULT true NOT NULL,
  token_version integer DEFAULT 1 NOT NULL,
  api_token text UNIQUE,
  is_active boolean DEFAULT false,
  last_active_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id varchar(7) PRIMARY KEY,
  email varchar(256) NOT NULL,
  token text NOT NULL UNIQUE,
  expires timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS clusters (
  id varchar(7) PRIMARY KEY,
  name varchar(256) NOT NULL,
  notes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id varchar(7) PRIMARY KEY,
  name varchar(256) NOT NULL,
  phone_number varchar(50),
  address text NOT NULL,
  latitude text,
  longitude text,
  house_picture_url text,
  house_pictures text,
  landmark text,
  access_info text,
  notes text,
  share_token varchar(16),
  share_token_expires_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_created_at_idx ON customers(created_at);
CREATE INDEX IF NOT EXISTS customers_name_idx ON customers(name);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone_number);
CREATE INDEX IF NOT EXISTS customers_share_token_idx ON customers(share_token);

CREATE TABLE IF NOT EXISTS customer_clusters (
  customer_id varchar(7) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  cluster_id varchar(7) NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, cluster_id)
);

CREATE TABLE IF NOT EXISTS customer_visits (
  id varchar(7) PRIMARY KEY,
  customer_id varchar(7) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id varchar(7) REFERENCES users(id) ON DELETE SET NULL,
  user_name varchar(256),
  visited_at timestamptz DEFAULT now() NOT NULL,
  checked_out_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS visits_customer_id_idx ON customer_visits(customer_id);
CREATE INDEX IF NOT EXISTS visits_visited_at_idx ON customer_visits(visited_at);

CREATE TABLE IF NOT EXISTS logs (
  id varchar(7) PRIMARY KEY,
  user_id varchar(7) REFERENCES users(id) ON DELETE SET NULL,
  user_name varchar(256),
  action varchar(100) NOT NULL,
  details text,
  target_id varchar(100),
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS logs_created_at_idx ON logs(created_at);

CREATE TABLE IF NOT EXISTS error_logs (
  id varchar(7) PRIMARY KEY,
  user_id varchar(7) REFERENCES users(id) ON DELETE SET NULL,
  user_name varchar(256),
  error_name varchar(256),
  error_message text,
  stack_trace text,
  pathname varchar(2048),
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON error_logs(created_at);

CREATE TABLE IF NOT EXISTS access_logs (
  id varchar(7) PRIMARY KEY,
  user_id varchar(7) REFERENCES users(id) ON DELETE SET NULL,
  user_name varchar(256),
  pathname varchar(2048) NOT NULL,
  method varchar(10) NOT NULL,
  ip_address varchar(100),
  user_agent text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_logs_created_at_idx ON access_logs(created_at);

CREATE TABLE IF NOT EXISTS sessions (
  id varchar(7) PRIMARY KEY,
  user_id varchar(7) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date varchar(10) NOT NULL,
  total_packages varchar(10) DEFAULT '0' NOT NULL,
  delivered_packages varchar(10) DEFAULT '0' NOT NULL,
  finalized boolean DEFAULT false NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_date_idx ON sessions(user_id, date);

CREATE TABLE IF NOT EXISTS incomings (
  id varchar(7) PRIMARY KEY,
  session_id varchar(7) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  time timestamp DEFAULT now() NOT NULL,
  packages varchar(10) NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS incomings_session_id_idx ON incomings(session_id);

CREATE TABLE IF NOT EXISTS session_deliveries (
  id varchar(7) PRIMARY KEY,
  session_id varchar(7) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  incoming_id varchar(7) NOT NULL REFERENCES incomings(id) ON DELETE CASCADE,
  customer_id varchar(7) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  packages varchar(10) DEFAULT '1' NOT NULL,
  status varchar(20) DEFAULT 'pending' NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS deliveries_session_id_idx ON session_deliveries(session_id);
CREATE INDEX IF NOT EXISTS deliveries_status_idx ON session_deliveries(status);
CREATE INDEX IF NOT EXISTS deliveries_incoming_id_idx ON session_deliveries(incoming_id);

CREATE TABLE IF NOT EXISTS saved_routes (
  id varchar(7) PRIMARY KEY,
  user_id varchar(7) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(256) NOT NULL,
  customer_ids text NOT NULL,
  start_lat varchar(32),
  start_lng varchar(32),
  end_lat varchar(32),
  end_lng varchar(32),
  created_at timestamp DEFAULT now() NOT NULL
);
`;
