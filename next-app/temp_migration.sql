-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "auth"."aal_level" AS ENUM ('aal1', 'aal2', 'aal3');

-- CreateEnum
CREATE TYPE "auth"."code_challenge_method" AS ENUM ('s256', 'plain');

-- CreateEnum
CREATE TYPE "auth"."factor_status" AS ENUM ('unverified', 'verified');

-- CreateEnum
CREATE TYPE "auth"."factor_type" AS ENUM ('totp', 'webauthn', 'phone');

-- CreateEnum
CREATE TYPE "auth"."oauth_registration_type" AS ENUM ('dynamic', 'manual');

-- CreateEnum
CREATE TYPE "auth"."one_time_token_type" AS ENUM ('confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token');

-- CreateEnum
CREATE TYPE "public"."app_role" AS ENUM ('ADMIN', 'EMITTER', 'TRANSPORTER', 'DISPOSER');

-- CreateEnum
CREATE TYPE "public"."billing_change_type" AS ENUM ('COMMISSION_RATE', 'COMMISSION_AMOUNT', 'ITEM_ADDED', 'ITEM_REMOVED', 'STATUS_CHANGED');

-- CreateEnum
CREATE TYPE "public"."billing_status" AS ENUM ('DRAFT', 'COLLECTOR_CONFIRMED', 'ADMIN_APPROVED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "public"."billing_type" AS ENUM ('MONTHLY_FIXED', 'SPOT_ACTUAL');

-- CreateEnum
CREATE TYPE "public"."closing_date_setting_type" AS ENUM ('COLLECTOR_TO_ADMIN', 'ADMIN_TO_END_USER');

-- CreateEnum
CREATE TYPE "public"."commission_type" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "public"."end_user_billing_status" AS ENUM ('DRAFT', 'FINALIZED', 'SENT');

-- CreateEnum
CREATE TYPE "public"."price_category" AS ENUM ('TRANSPORT', 'DISPOSAL', 'FIXED_MONTHLY', 'OTHER_FEES', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."reg_status" AS ENUM ('RESERVED', 'FAILED', 'PENDING', 'REGISTERED', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."tax_category" AS ENUM ('TAXABLE_10', 'TAXABLE_8', 'TAX_FREE');

-- CreateEnum
CREATE TYPE "public"."unit" AS ENUM ('T', 'KG', 'M3');

-- CreateEnum
CREATE TYPE "public"."unit_type" AS ENUM ('PER_VEHICLE', 'PER_M3', 'PER_KG', 'PER_MONTH', 'PER_ITEM');

-- CreateEnum
CREATE TYPE "auth"."oauth_authorization_status" AS ENUM ('pending', 'approved', 'denied', 'expired');

-- CreateEnum
CREATE TYPE "auth"."oauth_client_type" AS ENUM ('public', 'confidential');

-- CreateEnum
CREATE TYPE "auth"."oauth_response_type" AS ENUM ('code');

-- CreateTable
CREATE TABLE "app"."actuals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "org_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "actual_qty" DECIMAL NOT NULL,
    "unit" "public"."unit" NOT NULL DEFAULT 'T',
    "vehicle_no" TEXT,
    "driver_name" TEXT,
    "weighing_ticket_no" TEXT,
    "photo_urls" TEXT[],
    "confirmed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "actuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."approvals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "org_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "approved_by" UUID NOT NULL,
    "approved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "org_id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_role" "public"."app_role",
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "from_json" JSONB,
    "to_json" JSONB,
    "ip" TEXT,
    "ua" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."billing_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "collector_id" UUID NOT NULL,
    "store_id" UUID,
    "collection_id" UUID,
    "billing_month" DATE NOT NULL,
    "billing_period_from" DATE NOT NULL,
    "billing_period_to" DATE NOT NULL,
    "billing_type" VARCHAR(50) NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "item_code" VARCHAR(50),
    "waste_type_id" UUID,
    "unit_price" REAL,
    "quantity" REAL,
    "unit" VARCHAR(10),
    "amount" REAL NOT NULL,
    "tax_rate" REAL NOT NULL DEFAULT 0.10,
    "tax_amount" REAL NOT NULL,
    "total_amount" REAL NOT NULL,
    "jwnet_registration_id" VARCHAR(255),
    "jwnet_manifest_no" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "paid_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "billing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."billing_summaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "collector_id" UUID NOT NULL,
    "billing_month" DATE NOT NULL,
    "total_fixed_amount" REAL NOT NULL DEFAULT 0,
    "total_metered_amount" REAL NOT NULL DEFAULT 0,
    "total_other_amount" REAL NOT NULL DEFAULT 0,
    "subtotal_amount" REAL NOT NULL DEFAULT 0,
    "tax_amount" REAL NOT NULL DEFAULT 0,
    "total_amount" REAL NOT NULL DEFAULT 0,
    "total_items_count" INTEGER NOT NULL DEFAULT 0,
    "fixed_items_count" INTEGER NOT NULL DEFAULT 0,
    "metered_items_count" INTEGER NOT NULL DEFAULT 0,
    "other_items_count" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "paid_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "billing_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."collection_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "collector_id" UUID,
    "waste_type_id" UUID,
    "main_items" JSONB NOT NULL DEFAULT '[]',
    "other_items" JSONB DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT DEFAULT 'NORMAL',
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_collection_date" DATE,
    "actual_collection_date" DATE,
    "notes" TEXT,
    "created_by" TEXT NOT NULL DEFAULT 'system',
    "updated_by" TEXT NOT NULL DEFAULT 'system',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."collections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "actual_qty" DECIMAL(10,2) NOT NULL,
    "actual_unit" TEXT NOT NULL,
    "collected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jwnet_reservation_id" TEXT,
    "jwnet_registration_id" TEXT,
    "jwnet_status" TEXT,
    "photo_urls" JSONB DEFAULT '[]',
    "notes" TEXT,
    "created_by" TEXT NOT NULL DEFAULT 'system',
    "updated_by" TEXT NOT NULL DEFAULT 'system',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."contracts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "org_id" UUID NOT NULL,
    "emitter_id" UUID NOT NULL,
    "transporter_id" UUID,
    "disposer_id" UUID,
    "scope" JSONB,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."item_maps" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "org_id" UUID NOT NULL,
    "item_label" TEXT NOT NULL,
    "jwnet_code" TEXT NOT NULL,
    "hazard" BOOLEAN NOT NULL DEFAULT false,
    "default_unit" "public"."unit" NOT NULL DEFAULT 'T',
    "density_t_per_m3" DECIMAL,
    "disposal_method_code" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "item_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."jwnet_party_combinations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "emitter_org_id" UUID NOT NULL,
    "emitter_subscriber_no" VARCHAR(10) NOT NULL,
    "emitter_public_confirm_no" VARCHAR(10) NOT NULL,
    "emitter_name" VARCHAR(255) NOT NULL,
    "emitter_address" VARCHAR(500) NOT NULL,
    "emitter_postal_code" VARCHAR(20) NOT NULL,
    "transporter_org_id" UUID NOT NULL,
    "transporter_subscriber_no" VARCHAR(10) NOT NULL,
    "transporter_public_confirm_no" VARCHAR(10) NOT NULL,
    "transporter_name" VARCHAR(255) NOT NULL,
    "transporter_address" VARCHAR(500) NOT NULL,
    "transporter_postal_code" VARCHAR(20) NOT NULL,
    "transporter_phone" VARCHAR(50),
    "disposer_org_id" UUID NOT NULL,
    "disposer_subscriber_no" VARCHAR(10) NOT NULL,
    "disposer_public_confirm_no" VARCHAR(10) NOT NULL,
    "disposer_name" VARCHAR(255) NOT NULL,
    "disposer_address" VARCHAR(500) NOT NULL,
    "disposer_postal_code" VARCHAR(20) NOT NULL,
    "disposer_phone" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "jwnet_party_combinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."jwnet_waste_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "waste_code" VARCHAR(10) NOT NULL,
    "waste_name" VARCHAR(255) NOT NULL,
    "waste_category" VARCHAR(100) NOT NULL,
    "waste_type" VARCHAR(100) NOT NULL,
    "unit_code" VARCHAR(10) NOT NULL,
    "unit_name" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jwnet_waste_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."organizations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jwnet_subscriber_id" VARCHAR(10),
    "jwnet_public_confirmation_id" VARCHAR(10),
    "code" VARCHAR(50),
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "org_type" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."plans" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "org_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "planned_date" DATE NOT NULL,
    "item_map_id" UUID NOT NULL,
    "planned_qty" DECIMAL NOT NULL,
    "unit" "public"."unit" NOT NULL DEFAULT 'T',
    "earliest_pickup_date" DATE,
    "route_id" TEXT,
    "split_group" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."registrations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "org_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "manifest_no" TEXT,
    "status" "public"."reg_status" NOT NULL DEFAULT 'PENDING',
    "error_code" TEXT,
    "last_sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."reservations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "org_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "jwnet_temp_id" TEXT,
    "payload_hash" TEXT NOT NULL,
    "status" "public"."reg_status" NOT NULL DEFAULT 'PENDING',
    "last_sent_at" TIMESTAMPTZ(6),
    "error_code" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."stage_plans" (
    "id" BIGSERIAL NOT NULL,
    "org_id" UUID NOT NULL,
    "raw" JSONB NOT NULL,
    "received_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN DEFAULT false,

    CONSTRAINT "stage_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."store_collector_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "collector_id" UUID NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" DATE,
    "effective_to" DATE,
    "created_by" TEXT NOT NULL DEFAULT 'system',
    "updated_by" TEXT NOT NULL DEFAULT 'system',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_collector_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."stores" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "org_id" UUID NOT NULL,
    "store_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "area" TEXT,
    "emitter_no" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "jwnet_subscriber_id" VARCHAR(10),
    "jwnet_public_confirmation_id" VARCHAR(10),

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."user_org_roles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_org_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "email" VARCHAR(255) NOT NULL DEFAULT '',
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."collectors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "contact_person" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "license_number" VARCHAR(100),
    "service_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "collectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."waste_type_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "collector_id" UUID NOT NULL,
    "waste_type_code" VARCHAR(50) NOT NULL,
    "waste_type_name" VARCHAR(255) NOT NULL,
    "waste_category" VARCHAR(100) NOT NULL,
    "waste_classification" VARCHAR(100) NOT NULL,
    "jwnet_waste_code_id" UUID NOT NULL,
    "jwnet_waste_code" VARCHAR(10) NOT NULL,
    "unit_code" VARCHAR(10) NOT NULL,
    "unit_price" REAL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "billing_category" VARCHAR(20),
    "billing_type_default" VARCHAR(20),

    CONSTRAINT "waste_type_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."audit_log_entries" (
    "instance_id" UUID,
    "id" UUID NOT NULL,
    "payload" JSON,
    "created_at" TIMESTAMPTZ(6),
    "ip_address" VARCHAR(64) NOT NULL DEFAULT '',

    CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."flow_state" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "auth_code" TEXT NOT NULL,
    "code_challenge_method" "auth"."code_challenge_method" NOT NULL,
    "code_challenge" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL,
    "provider_access_token" TEXT,
    "provider_refresh_token" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "authentication_method" TEXT NOT NULL,
    "auth_code_issued_at" TIMESTAMPTZ(6),

    CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."identities" (
    "provider_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "identity_data" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "last_sign_in_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "email" TEXT DEFAULT lower((identity_data ->> 'email'::text)),
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."instances" (
    "id" UUID NOT NULL,
    "uuid" UUID,
    "raw_base_config" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."mfa_amr_claims" (
    "session_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "authentication_method" TEXT NOT NULL,
    "id" UUID NOT NULL,

    CONSTRAINT "amr_id_pk" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."mfa_challenges" (
    "id" UUID NOT NULL,
    "factor_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "ip_address" INET NOT NULL,
    "otp_code" TEXT,
    "web_authn_session_data" JSONB,

    CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."mfa_factors" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "friendly_name" TEXT,
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "secret" TEXT,
    "phone" TEXT,
    "last_challenged_at" TIMESTAMPTZ(6),
    "web_authn_credential" JSONB,
    "web_authn_aaguid" UUID,

    CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."oauth_clients" (
    "id" UUID NOT NULL,
    "client_secret_hash" TEXT,
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" TEXT NOT NULL,
    "grant_types" TEXT NOT NULL,
    "client_name" TEXT,
    "client_uri" TEXT,
    "logo_uri" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "client_type" "auth"."oauth_client_type" NOT NULL DEFAULT 'confidential',

    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."one_time_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "relates_to" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."refresh_tokens" (
    "instance_id" UUID,
    "id" BIGSERIAL NOT NULL,
    "token" VARCHAR(255),
    "user_id" VARCHAR(255),
    "revoked" BOOLEAN,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "parent" VARCHAR(255),
    "session_id" UUID,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."saml_providers" (
    "id" UUID NOT NULL,
    "sso_provider_id" UUID NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata_xml" TEXT NOT NULL,
    "metadata_url" TEXT,
    "attribute_mapping" JSONB,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "name_id_format" TEXT,

    CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."saml_relay_states" (
    "id" UUID NOT NULL,
    "sso_provider_id" UUID NOT NULL,
    "request_id" TEXT NOT NULL,
    "for_email" TEXT,
    "redirect_to" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "flow_state_id" UUID,

    CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."schema_migrations" (
    "version" VARCHAR(255) NOT NULL,

    CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "auth"."sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "factor_id" UUID,
    "aal" "auth"."aal_level",
    "not_after" TIMESTAMPTZ(6),
    "refreshed_at" TIMESTAMP(6),
    "user_agent" TEXT,
    "ip" INET,
    "tag" TEXT,
    "oauth_client_id" UUID,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."sso_domains" (
    "id" UUID NOT NULL,
    "sso_provider_id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."sso_providers" (
    "id" UUID NOT NULL,
    "resource_id" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "disabled" BOOLEAN,

    CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."users" (
    "instance_id" UUID,
    "id" UUID NOT NULL,
    "aud" VARCHAR(255),
    "role" VARCHAR(255),
    "email" VARCHAR(255),
    "encrypted_password" VARCHAR(255),
    "email_confirmed_at" TIMESTAMPTZ(6),
    "invited_at" TIMESTAMPTZ(6),
    "confirmation_token" VARCHAR(255),
    "confirmation_sent_at" TIMESTAMPTZ(6),
    "recovery_token" VARCHAR(255),
    "recovery_sent_at" TIMESTAMPTZ(6),
    "email_change_token_new" VARCHAR(255),
    "email_change" VARCHAR(255),
    "email_change_sent_at" TIMESTAMPTZ(6),
    "last_sign_in_at" TIMESTAMPTZ(6),
    "raw_app_meta_data" JSONB,
    "raw_user_meta_data" JSONB,
    "is_super_admin" BOOLEAN,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "phone" TEXT,
    "phone_confirmed_at" TIMESTAMPTZ(6),
    "phone_change" TEXT DEFAULT '',
    "phone_change_token" VARCHAR(255) DEFAULT '',
    "phone_change_sent_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6) DEFAULT LEAST(email_confirmed_at, phone_confirmed_at),
    "email_change_token_current" VARCHAR(255) DEFAULT '',
    "email_change_confirm_status" SMALLINT DEFAULT 0,
    "banned_until" TIMESTAMPTZ(6),
    "reauthentication_token" VARCHAR(255) DEFAULT '',
    "reauthentication_sent_at" TIMESTAMPTZ(6),
    "is_sso_user" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_change_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "billing_record_id" UUID NOT NULL,
    "billing_item_id" UUID,
    "change_type" "public"."billing_change_type" NOT NULL,
    "field_name" VARCHAR(100),
    "old_value" TEXT,
    "new_value" TEXT,
    "change_reason" TEXT,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "billing_record_id" UUID NOT NULL,
    "price_master_id" UUID NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "tax_category" "public"."tax_category" NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "billing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "collector_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "billing_period" VARCHAR(7) NOT NULL,
    "billing_type" "public"."billing_type" NOT NULL,
    "reference_id" UUID,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "status" "public"."billing_status" NOT NULL DEFAULT 'DRAFT',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "billing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."closing_date_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "setting_type" "public"."closing_date_setting_type" NOT NULL,
    "end_user_id" UUID,
    "closing_day" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "closing_date_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."commission_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "price_master_id" UUID NOT NULL,
    "commission_type" "public"."commission_type" NOT NULL,
    "commission_rate" DECIMAL(5,2),
    "commission_amount" DECIMAL(10,2),
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "commission_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."end_user_billing_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "billing_record_id" UUID NOT NULL,
    "source_billing_item_id" UUID NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "original_unit_price" DECIMAL(10,2) NOT NULL,
    "commission_rate" DECIMAL(5,2),
    "commission_amount" DECIMAL(10,2),
    "adjusted_unit_price" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "tax_category" "public"."tax_category" NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "end_user_billing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."end_user_billing_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "end_user_id" UUID NOT NULL,
    "billing_period" VARCHAR(7) NOT NULL,
    "closing_date" DATE NOT NULL,
    "status" "public"."end_user_billing_status" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax_breakdown" JSONB,
    "commission_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "original_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "end_user_billing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."holiday_stores" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "holiday_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."holiday_surveys" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "template_id" UUID,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "response_deadline" TIMESTAMPTZ(6),
    "status" TEXT DEFAULT 'DRAFT',
    "last_sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "holiday_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."price_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "collector_id" UUID NOT NULL,
    "waste_type_id" UUID NOT NULL,
    "store_id" UUID,
    "price_category" "public"."price_category" NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "unit" "public"."unit_type" NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'JPY',
    "tax_category" "public"."tax_category" NOT NULL DEFAULT 'TAXABLE_10',
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "minimum_charge" DECIMAL(10,2),
    "maximum_charge" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "price_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."store_waste_types" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "store_id" UUID NOT NULL,
    "waste_type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "store_waste_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."survey_comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "survey_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN DEFAULT false,
    "status" TEXT DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "survey_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."survey_recipients" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "survey_id" UUID NOT NULL,
    "collector_id" UUID NOT NULL,
    "status" TEXT DEFAULT 'PENDING',
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "survey_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."survey_responses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "survey_id" UUID NOT NULL,
    "collector_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "waste_type_id" UUID NOT NULL,
    "responses" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."survey_templates" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "survey_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "company_name" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "org_id" TEXT,
    "contact_person" TEXT,
    "license_number" TEXT,
    "service_areas" TEXT[],
    "waste_types" TEXT[],
    "collection_schedule" JSONB,
    "special_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."waste_types" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "waste_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."oauth_authorizations" (
    "id" UUID NOT NULL,
    "authorization_id" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "user_id" UUID,
    "redirect_uri" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "state" TEXT,
    "resource" TEXT,
    "code_challenge" TEXT,
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" NOT NULL DEFAULT 'code',
    "status" "auth"."oauth_authorization_status" NOT NULL DEFAULT 'pending',
    "authorization_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() + '00:03:00'::interval),
    "approved_at" TIMESTAMPTZ(6),

    CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."oauth_consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "scopes" TEXT NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."hearings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_period_from" DATE NOT NULL,
    "target_period_to" DATE NOT NULL,
    "response_deadline" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "hearings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."hearing_external_stores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "store_code" TEXT NOT NULL,
    "store_name" TEXT NOT NULL,
    "address" TEXT,
    "primary_collector_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "hearing_external_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."store_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_code" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "assigned_collector_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "store_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."hearing_external_store_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "external_store_id" UUID NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_code" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "assigned_collector_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "hearing_external_store_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."hearing_targets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hearing_id" UUID NOT NULL,
    "collector_id" UUID NOT NULL,
    "store_id" UUID,
    "external_store_id" UUID,
    "store_item_id" UUID,
    "external_store_item_id" UUID,
    "company_name" TEXT NOT NULL,
    "store_name" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "notified_at" TIMESTAMPTZ(6),
    "notification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "response_status" TEXT NOT NULL DEFAULT 'NOT_RESPONDED',
    "responded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hearing_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."hearing_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hearing_target_id" UUID NOT NULL,
    "target_date" DATE NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "responded_by" UUID NOT NULL,
    "responded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "hearing_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."hearing_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hearing_target_id" UUID NOT NULL,
    "comment" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "user_role" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "parent_comment_id" UUID,
    "is_read_by_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_read_by_collector" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "hearing_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."hearing_unlock_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hearing_target_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "request_reason" TEXT NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "review_comment" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),

    CONSTRAINT "hearing_unlock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."hearing_reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hearing_id" UUID NOT NULL,
    "collector_id" UUID NOT NULL,
    "reminder_type" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hearing_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "actuals_plan_id_key" ON "app"."actuals"("plan_id");

-- CreateIndex
CREATE INDEX "idx_actuals_org_id" ON "app"."actuals"("org_id");

-- CreateIndex
CREATE INDEX "idx_actuals_plan_id" ON "app"."actuals"("plan_id");

-- CreateIndex
CREATE INDEX "idx_actuals_plan_id_created" ON "app"."actuals"("plan_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "approvals_plan_id_key" ON "app"."approvals"("plan_id");

-- CreateIndex
CREATE INDEX "idx_approvals_org_id" ON "app"."approvals"("org_id");

-- CreateIndex
CREATE INDEX "idx_approvals_plan_id" ON "app"."approvals"("plan_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "app"."audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_org" ON "app"."audit_logs"("created_at" DESC, "org_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_org_id" ON "app"."audit_logs"("org_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_recent" ON "app"."audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_billing_collection" ON "app"."billing_items"("collection_id");

-- CreateIndex
CREATE INDEX "idx_billing_collector" ON "app"."billing_items"("collector_id");

-- CreateIndex
CREATE INDEX "idx_billing_month" ON "app"."billing_items"("billing_month");

-- CreateIndex
CREATE INDEX "idx_billing_org" ON "app"."billing_items"("org_id");

-- CreateIndex
CREATE INDEX "idx_billing_status" ON "app"."billing_items"("status");

-- CreateIndex
CREATE INDEX "idx_billing_store" ON "app"."billing_items"("store_id");

-- CreateIndex
CREATE INDEX "idx_billing_submitted" ON "app"."billing_items"("submitted_at");

-- CreateIndex
CREATE INDEX "idx_billing_type" ON "app"."billing_items"("billing_type");

-- CreateIndex
CREATE INDEX "idx_billing_summary_collector" ON "app"."billing_summaries"("collector_id");

-- CreateIndex
CREATE INDEX "idx_billing_summary_month" ON "app"."billing_summaries"("billing_month");

-- CreateIndex
CREATE INDEX "idx_billing_summary_org" ON "app"."billing_summaries"("org_id");

-- CreateIndex
CREATE INDEX "idx_billing_summary_status" ON "app"."billing_summaries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "unique_billing_summary" ON "app"."billing_summaries"("org_id", "collector_id", "billing_month");

-- CreateIndex
CREATE INDEX "idx_collection_requests_collector_id" ON "app"."collection_requests"("collector_id");

-- CreateIndex
CREATE INDEX "idx_collection_requests_org_id" ON "app"."collection_requests"("org_id");

-- CreateIndex
CREATE INDEX "idx_collection_requests_scheduled_date" ON "app"."collection_requests"("scheduled_collection_date");

-- CreateIndex
CREATE INDEX "idx_collection_requests_status" ON "app"."collection_requests"("status");

-- CreateIndex
CREATE INDEX "idx_collection_requests_store_id" ON "app"."collection_requests"("store_id");

-- CreateIndex
CREATE INDEX "idx_collections_collected_at" ON "app"."collections"("collected_at");

-- CreateIndex
CREATE INDEX "idx_collections_org_id" ON "app"."collections"("org_id");

-- CreateIndex
CREATE INDEX "idx_collections_request_id" ON "app"."collections"("request_id");

-- CreateIndex
CREATE INDEX "idx_item_maps_org_id" ON "app"."item_maps"("org_id");

-- CreateIndex
CREATE INDEX "idx_item_maps_org_label" ON "app"."item_maps"("org_id", "item_label");

-- CreateIndex
CREATE UNIQUE INDEX "item_maps_org_id_item_label_key" ON "app"."item_maps"("org_id", "item_label");

-- CreateIndex
CREATE INDEX "idx_jwnet_party_combo_active" ON "app"."jwnet_party_combinations"("is_active");

-- CreateIndex
CREATE INDEX "idx_jwnet_party_combo_disposer" ON "app"."jwnet_party_combinations"("disposer_org_id");

-- CreateIndex
CREATE INDEX "idx_jwnet_party_combo_emitter" ON "app"."jwnet_party_combinations"("emitter_org_id");

-- CreateIndex
CREATE INDEX "idx_jwnet_party_combo_org_id" ON "app"."jwnet_party_combinations"("org_id");

-- CreateIndex
CREATE INDEX "idx_jwnet_party_combo_transporter" ON "app"."jwnet_party_combinations"("transporter_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_party_combination" ON "app"."jwnet_party_combinations"("emitter_subscriber_no", "emitter_public_confirm_no", "transporter_subscriber_no", "transporter_public_confirm_no", "disposer_subscriber_no", "disposer_public_confirm_no");

-- CreateIndex
CREATE UNIQUE INDEX "jwnet_waste_codes_waste_code_key" ON "app"."jwnet_waste_codes"("waste_code");

-- CreateIndex
CREATE INDEX "idx_jwnet_waste_active" ON "app"."jwnet_waste_codes"("is_active");

-- CreateIndex
CREATE INDEX "idx_jwnet_waste_category" ON "app"."jwnet_waste_codes"("waste_category");

-- CreateIndex
CREATE INDEX "idx_jwnet_waste_code" ON "app"."jwnet_waste_codes"("waste_code");

-- CreateIndex
CREATE INDEX "idx_plans_org_date" ON "app"."plans"("org_id", "planned_date");

-- CreateIndex
CREATE INDEX "idx_plans_org_id" ON "app"."plans"("org_id");

-- CreateIndex
CREATE INDEX "idx_plans_org_store_date" ON "app"."plans"("org_id", "store_id", "planned_date");

-- CreateIndex
CREATE UNIQUE INDEX "plans_org_id_store_id_planned_date_item_map_id_key" ON "app"."plans"("org_id", "store_id", "planned_date", "item_map_id");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_plan_id_key" ON "app"."registrations"("plan_id");

-- CreateIndex
CREATE INDEX "idx_registrations_org_id" ON "app"."registrations"("org_id");

-- CreateIndex
CREATE INDEX "idx_registrations_org_status" ON "app"."registrations"("org_id", "status");

-- CreateIndex
CREATE INDEX "idx_registrations_status" ON "app"."registrations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_payload_hash_key" ON "app"."reservations"("payload_hash");

-- CreateIndex
CREATE INDEX "idx_reservations_org_id" ON "app"."reservations"("org_id");

-- CreateIndex
CREATE INDEX "idx_reservations_org_status" ON "app"."reservations"("org_id", "status");

-- CreateIndex
CREATE INDEX "idx_reservations_status" ON "app"."reservations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_org_id_plan_id_key" ON "app"."reservations"("org_id", "plan_id");

-- CreateIndex
CREATE INDEX "idx_stage_plans_org_id" ON "app"."stage_plans"("org_id");

-- CreateIndex
CREATE INDEX "idx_stage_plans_processed" ON "app"."stage_plans"("processed");

-- CreateIndex
CREATE INDEX "idx_store_collector_assignments_collector_id" ON "app"."store_collector_assignments"("collector_id");

-- CreateIndex
CREATE INDEX "idx_store_collector_assignments_is_active" ON "app"."store_collector_assignments"("is_active");

-- CreateIndex
CREATE INDEX "idx_store_collector_assignments_org_id" ON "app"."store_collector_assignments"("org_id");

-- CreateIndex
CREATE INDEX "idx_store_collector_assignments_store_id" ON "app"."store_collector_assignments"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_collector_unique" ON "app"."store_collector_assignments"("store_id", "collector_id");

-- CreateIndex
CREATE INDEX "idx_stores_org_code" ON "app"."stores"("org_id", "store_code");

-- CreateIndex
CREATE INDEX "idx_stores_org_id" ON "app"."stores"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "stores_org_id_store_code_key" ON "app"."stores"("org_id", "store_code");

-- CreateIndex
CREATE UNIQUE INDEX "user_org_roles_user_id_org_id_role_key" ON "app"."user_org_roles"("user_id", "org_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_user_id_key" ON "app"."users"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "app"."users"("email");

-- CreateIndex
CREATE INDEX "idx_users_auth_user_id" ON "app"."users"("auth_user_id");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "app"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "collectors_user_id_key" ON "app"."collectors"("user_id");

-- CreateIndex
CREATE INDEX "idx_collectors_user_id" ON "app"."collectors"("user_id");

-- CreateIndex
CREATE INDEX "idx_collectors_deleted_at" ON "app"."collectors"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_waste_type_active" ON "app"."waste_type_masters"("is_active");

-- CreateIndex
CREATE INDEX "idx_waste_type_collector" ON "app"."waste_type_masters"("collector_id");

-- CreateIndex
CREATE INDEX "idx_waste_type_jwnet_code" ON "app"."waste_type_masters"("jwnet_waste_code");

-- CreateIndex
CREATE INDEX "idx_waste_type_masters_billing_category" ON "app"."waste_type_masters"("billing_category");

-- CreateIndex
CREATE INDEX "idx_waste_type_org" ON "app"."waste_type_masters"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_waste_type_per_collector" ON "app"."waste_type_masters"("org_id", "collector_id", "waste_type_code");

-- CreateIndex
CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries"("instance_id");

-- CreateIndex
CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_auth_code" ON "auth"."flow_state"("auth_code");

-- CreateIndex
CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state"("user_id", "authentication_method");

-- CreateIndex
CREATE INDEX "identities_email_idx" ON "auth"."identities"("email");

-- CreateIndex
CREATE INDEX "identities_user_id_idx" ON "auth"."identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "identities_provider_id_provider_unique" ON "auth"."identities"("provider_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_amr_claims_session_id_authentication_method_pkey" ON "auth"."mfa_amr_claims"("session_id", "authentication_method");

-- CreateIndex
CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "mfa_factors_last_challenged_at_key" ON "auth"."mfa_factors"("last_challenged_at");

-- CreateIndex
CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors"("user_id", "phone");

-- CreateIndex
CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients"("deleted_at");

-- CreateIndex
CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING HASH ("relates_to");

-- CreateIndex
CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING HASH ("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens"("user_id", "token_type");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_unique" ON "auth"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens"("instance_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens"("instance_id", "user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens"("parent");

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens"("session_id", "revoked");

-- CreateIndex
CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens"("updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "saml_providers_entity_id_key" ON "auth"."saml_providers"("entity_id");

-- CreateIndex
CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers"("sso_provider_id");

-- CreateIndex
CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states"("created_at" DESC);

-- CreateIndex
CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states"("for_email");

-- CreateIndex
CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states"("sso_provider_id");

-- CreateIndex
CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions"("not_after" DESC);

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions"("oauth_client_id");

-- CreateIndex
CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains"("sso_provider_id");

-- CreateIndex
CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "auth"."users"("phone");

-- CreateIndex
CREATE INDEX "users_instance_id_idx" ON "auth"."users"("instance_id");

-- CreateIndex
CREATE INDEX "users_is_anonymous_idx" ON "auth"."users"("is_anonymous");

-- CreateIndex
CREATE INDEX "idx_billing_change_logs_changed_at" ON "public"."billing_change_logs"("changed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_billing_change_logs_changed_by" ON "public"."billing_change_logs"("changed_by");

-- CreateIndex
CREATE INDEX "idx_billing_change_logs_record" ON "public"."billing_change_logs"("billing_record_id");

-- CreateIndex
CREATE INDEX "idx_billing_item_aggregation" ON "public"."billing_items"("billing_record_id", "price_master_id");

-- CreateIndex
CREATE INDEX "idx_billing_item_price_master" ON "public"."billing_items"("price_master_id");

-- CreateIndex
CREATE INDEX "idx_billing_item_record" ON "public"."billing_items"("billing_record_id");

-- CreateIndex
CREATE INDEX "idx_billing_record_org_period" ON "public"."billing_records"("org_id", "billing_period");

-- CreateIndex
CREATE INDEX "idx_billing_record_period" ON "public"."billing_records"("collector_id", "billing_period", "status");

-- CreateIndex
CREATE INDEX "idx_billing_record_store_period" ON "public"."billing_records"("store_id", "billing_period");

-- CreateIndex
CREATE INDEX "idx_closing_date_settings_org_type" ON "public"."closing_date_settings"("org_id", "setting_type");

-- CreateIndex
CREATE UNIQUE INDEX "unique_collector_to_admin_per_org" ON "public"."closing_date_settings"("org_id", "setting_type");

-- CreateIndex
CREATE UNIQUE INDEX "unique_end_user_setting" ON "public"."closing_date_settings"("org_id", "end_user_id");

-- CreateIndex
CREATE INDEX "idx_commission_masters_effective_dates" ON "public"."commission_masters"("effective_from", "effective_to");

-- CreateIndex
CREATE INDEX "idx_commission_masters_org" ON "public"."commission_masters"("org_id");

-- CreateIndex
CREATE INDEX "idx_commission_masters_price_master" ON "public"."commission_masters"("price_master_id");

-- CreateIndex
CREATE INDEX "idx_end_user_billing_items_org" ON "public"."end_user_billing_items"("org_id");

-- CreateIndex
CREATE INDEX "idx_end_user_billing_items_record" ON "public"."end_user_billing_items"("billing_record_id");

-- CreateIndex
CREATE INDEX "idx_end_user_billing_items_source" ON "public"."end_user_billing_items"("source_billing_item_id");

-- CreateIndex
CREATE INDEX "idx_end_user_billing_records_end_user" ON "public"."end_user_billing_records"("end_user_id");

-- CreateIndex
CREATE INDEX "idx_end_user_billing_records_org" ON "public"."end_user_billing_records"("org_id");

-- CreateIndex
CREATE INDEX "idx_end_user_billing_records_period" ON "public"."end_user_billing_records"("billing_period");

-- CreateIndex
CREATE INDEX "idx_end_user_billing_records_status" ON "public"."end_user_billing_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "unique_end_user_billing_period" ON "public"."end_user_billing_records"("org_id", "end_user_id", "billing_period");

-- CreateIndex
CREATE INDEX "idx_price_master_effective_date" ON "public"."price_masters"("effective_from", "effective_to");

-- CreateIndex
CREATE INDEX "idx_price_master_org_collector" ON "public"."price_masters"("org_id", "collector_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorizations_authorization_id_key" ON "auth"."oauth_authorizations"("authorization_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorizations_authorization_code_key" ON "auth"."oauth_authorizations"("authorization_code");

-- CreateIndex
CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents"("user_id", "granted_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_consents_user_client_unique" ON "auth"."oauth_consents"("user_id", "client_id");

-- CreateIndex
CREATE INDEX "idx_hearings_org" ON "app"."hearings"("org_id");

-- CreateIndex
CREATE INDEX "idx_hearings_status" ON "app"."hearings"("status");

-- CreateIndex
CREATE INDEX "idx_hearings_deadline" ON "app"."hearings"("response_deadline");

-- CreateIndex
CREATE INDEX "idx_external_stores_org" ON "app"."hearing_external_stores"("org_id");

-- CreateIndex
CREATE INDEX "idx_external_stores_collector" ON "app"."hearing_external_stores"("primary_collector_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_external_store_code" ON "app"."hearing_external_stores"("org_id", "company_name", "store_code");

-- CreateIndex
CREATE INDEX "idx_store_items_org" ON "app"."store_items"("org_id");

-- CreateIndex
CREATE INDEX "idx_store_items_store" ON "app"."store_items"("store_id");

-- CreateIndex
CREATE INDEX "idx_store_items_collector" ON "app"."store_items"("assigned_collector_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_store_item_name" ON "app"."store_items"("org_id", "store_id", "item_name");

-- CreateIndex
CREATE INDEX "idx_external_store_items_org" ON "app"."hearing_external_store_items"("org_id");

-- CreateIndex
CREATE INDEX "idx_external_store_items_store" ON "app"."hearing_external_store_items"("external_store_id");

-- CreateIndex
CREATE INDEX "idx_external_store_items_collector" ON "app"."hearing_external_store_items"("assigned_collector_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_external_store_item_name" ON "app"."hearing_external_store_items"("org_id", "external_store_id", "item_name");

-- CreateIndex
CREATE INDEX "idx_hearing_targets_hearing" ON "app"."hearing_targets"("hearing_id");

-- CreateIndex
CREATE INDEX "idx_hearing_targets_collector" ON "app"."hearing_targets"("collector_id");

-- CreateIndex
CREATE INDEX "idx_hearing_targets_response_status" ON "app"."hearing_targets"("response_status");

-- CreateIndex
CREATE INDEX "idx_hearing_targets_store_item" ON "app"."hearing_targets"("store_item_id");

-- CreateIndex
CREATE INDEX "idx_hearing_targets_external_store_item" ON "app"."hearing_targets"("external_store_item_id");

-- CreateIndex
CREATE INDEX "idx_hearing_responses_target" ON "app"."hearing_responses"("hearing_target_id");

-- CreateIndex
CREATE INDEX "idx_hearing_responses_date" ON "app"."hearing_responses"("target_date");

-- CreateIndex
CREATE INDEX "idx_hearing_responses_available" ON "app"."hearing_responses"("is_available");

-- CreateIndex
CREATE UNIQUE INDEX "uk_hearing_response_date" ON "app"."hearing_responses"("hearing_target_id", "target_date");

-- CreateIndex
CREATE INDEX "idx_hearing_comments_target" ON "app"."hearing_comments"("hearing_target_id");

-- CreateIndex
CREATE INDEX "idx_hearing_comments_created" ON "app"."hearing_comments"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_unlock_requests_target" ON "app"."hearing_unlock_requests"("hearing_target_id");

-- CreateIndex
CREATE INDEX "idx_unlock_requests_status" ON "app"."hearing_unlock_requests"("status");

-- CreateIndex
CREATE INDEX "idx_hearing_reminders_hearing" ON "app"."hearing_reminders"("hearing_id");

-- CreateIndex
CREATE INDEX "idx_hearing_reminders_collector" ON "app"."hearing_reminders"("collector_id");

-- CreateIndex
CREATE INDEX "idx_hearing_reminders_status" ON "app"."hearing_reminders"("status");

-- CreateIndex
CREATE INDEX "idx_hearing_reminders_type" ON "app"."hearing_reminders"("reminder_type");

-- AddForeignKey
ALTER TABLE "app"."actuals" ADD CONSTRAINT "actuals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."actuals" ADD CONSTRAINT "actuals_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."actuals" ADD CONSTRAINT "actuals_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "app"."plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."actuals" ADD CONSTRAINT "actuals_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "app"."plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."audit_logs" ADD CONSTRAINT "audit_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."collection_requests" ADD CONSTRAINT "collection_requests_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."collection_requests" ADD CONSTRAINT "collection_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."collection_requests" ADD CONSTRAINT "collection_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "app"."stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."collection_requests" ADD CONSTRAINT "collection_requests_waste_type_id_fkey" FOREIGN KEY ("waste_type_id") REFERENCES "public"."waste_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."collections" ADD CONSTRAINT "collections_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."collections" ADD CONSTRAINT "collections_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "app"."collection_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."contracts" ADD CONSTRAINT "contracts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."contracts" ADD CONSTRAINT "contracts_emitter_id_fkey" FOREIGN KEY ("emitter_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."contracts" ADD CONSTRAINT "contracts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."contracts" ADD CONSTRAINT "contracts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."item_maps" ADD CONSTRAINT "item_maps_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."item_maps" ADD CONSTRAINT "item_maps_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."item_maps" ADD CONSTRAINT "item_maps_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."jwnet_party_combinations" ADD CONSTRAINT "fk_jwnet_party_combo_disposer" FOREIGN KEY ("disposer_org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."jwnet_party_combinations" ADD CONSTRAINT "fk_jwnet_party_combo_emitter" FOREIGN KEY ("emitter_org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."jwnet_party_combinations" ADD CONSTRAINT "fk_jwnet_party_combo_transporter" FOREIGN KEY ("transporter_org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."plans" ADD CONSTRAINT "plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."plans" ADD CONSTRAINT "plans_item_map_id_fkey" FOREIGN KEY ("item_map_id") REFERENCES "app"."item_maps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."plans" ADD CONSTRAINT "plans_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."plans" ADD CONSTRAINT "plans_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "app"."stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."plans" ADD CONSTRAINT "plans_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."registrations" ADD CONSTRAINT "registrations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."registrations" ADD CONSTRAINT "registrations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."registrations" ADD CONSTRAINT "registrations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "app"."plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."registrations" ADD CONSTRAINT "registrations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."reservations" ADD CONSTRAINT "reservations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."reservations" ADD CONSTRAINT "reservations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."reservations" ADD CONSTRAINT "reservations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "app"."plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."reservations" ADD CONSTRAINT "reservations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."stage_plans" ADD CONSTRAINT "stage_plans_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."store_collector_assignments" ADD CONSTRAINT "store_collector_assignments_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."store_collector_assignments" ADD CONSTRAINT "store_collector_assignments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."store_collector_assignments" ADD CONSTRAINT "store_collector_assignments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "app"."stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."stores" ADD CONSTRAINT "stores_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."stores" ADD CONSTRAINT "stores_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."stores" ADD CONSTRAINT "stores_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."user_org_roles" ADD CONSTRAINT "user_org_roles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."user_org_roles" ADD CONSTRAINT "user_org_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."users" ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."collectors" ADD CONSTRAINT "fk_collector_user" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."waste_type_masters" ADD CONSTRAINT "fk_waste_type_collector" FOREIGN KEY ("collector_id") REFERENCES "app"."collectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."waste_type_masters" ADD CONSTRAINT "fk_waste_type_jwnet_code" FOREIGN KEY ("jwnet_waste_code_id") REFERENCES "app"."jwnet_waste_codes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."identities" ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."mfa_amr_claims" ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."mfa_challenges" ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."one_time_tokens" ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."sso_domains" ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_change_logs" ADD CONSTRAINT "billing_change_logs_billing_item_id_fkey" FOREIGN KEY ("billing_item_id") REFERENCES "public"."end_user_billing_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_change_logs" ADD CONSTRAINT "billing_change_logs_billing_record_id_fkey" FOREIGN KEY ("billing_record_id") REFERENCES "public"."end_user_billing_records"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_change_logs" ADD CONSTRAINT "billing_change_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_change_logs" ADD CONSTRAINT "billing_change_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_items" ADD CONSTRAINT "fk_billing_item_org" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_items" ADD CONSTRAINT "fk_billing_item_price_master" FOREIGN KEY ("price_master_id") REFERENCES "public"."price_masters"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_items" ADD CONSTRAINT "fk_billing_item_record" FOREIGN KEY ("billing_record_id") REFERENCES "public"."billing_records"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_records" ADD CONSTRAINT "fk_billing_record_approved_by" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_records" ADD CONSTRAINT "fk_billing_record_collector" FOREIGN KEY ("collector_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_records" ADD CONSTRAINT "fk_billing_record_org" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_records" ADD CONSTRAINT "fk_billing_record_store" FOREIGN KEY ("store_id") REFERENCES "app"."stores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."closing_date_settings" ADD CONSTRAINT "closing_date_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."closing_date_settings" ADD CONSTRAINT "closing_date_settings_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."closing_date_settings" ADD CONSTRAINT "closing_date_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."closing_date_settings" ADD CONSTRAINT "closing_date_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."commission_masters" ADD CONSTRAINT "commission_masters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."commission_masters" ADD CONSTRAINT "commission_masters_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."commission_masters" ADD CONSTRAINT "commission_masters_price_master_id_fkey" FOREIGN KEY ("price_master_id") REFERENCES "public"."price_masters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."commission_masters" ADD CONSTRAINT "commission_masters_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."end_user_billing_items" ADD CONSTRAINT "end_user_billing_items_billing_record_id_fkey" FOREIGN KEY ("billing_record_id") REFERENCES "public"."end_user_billing_records"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."end_user_billing_items" ADD CONSTRAINT "end_user_billing_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."end_user_billing_items" ADD CONSTRAINT "end_user_billing_items_source_billing_item_id_fkey" FOREIGN KEY ("source_billing_item_id") REFERENCES "public"."billing_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."end_user_billing_records" ADD CONSTRAINT "end_user_billing_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."end_user_billing_records" ADD CONSTRAINT "end_user_billing_records_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."end_user_billing_records" ADD CONSTRAINT "end_user_billing_records_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."end_user_billing_records" ADD CONSTRAINT "end_user_billing_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."holiday_stores" ADD CONSTRAINT "holiday_stores_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."holiday_surveys" ADD CONSTRAINT "holiday_surveys_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."survey_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."price_masters" ADD CONSTRAINT "fk_price_master_collector" FOREIGN KEY ("collector_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."price_masters" ADD CONSTRAINT "fk_price_master_org" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."price_masters" ADD CONSTRAINT "fk_price_master_store" FOREIGN KEY ("store_id") REFERENCES "app"."stores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."price_masters" ADD CONSTRAINT "fk_price_master_waste_type" FOREIGN KEY ("waste_type_id") REFERENCES "public"."waste_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."store_waste_types" ADD CONSTRAINT "store_waste_types_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."holiday_stores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."store_waste_types" ADD CONSTRAINT "store_waste_types_waste_type_id_fkey" FOREIGN KEY ("waste_type_id") REFERENCES "public"."waste_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."survey_comments" ADD CONSTRAINT "survey_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."survey_comments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."survey_comments" ADD CONSTRAINT "survey_comments_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."holiday_surveys"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."survey_comments" ADD CONSTRAINT "survey_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."survey_recipients" ADD CONSTRAINT "survey_recipients_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."survey_recipients" ADD CONSTRAINT "survey_recipients_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."holiday_surveys"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."survey_responses" ADD CONSTRAINT "survey_responses_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."survey_responses" ADD CONSTRAINT "survey_responses_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."holiday_stores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."holiday_surveys"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."survey_responses" ADD CONSTRAINT "survey_responses_waste_type_id_fkey" FOREIGN KEY ("waste_type_id") REFERENCES "public"."waste_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearings" ADD CONSTRAINT "hearings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearings" ADD CONSTRAINT "hearings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearings" ADD CONSTRAINT "hearings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_external_stores" ADD CONSTRAINT "hearing_external_stores_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_external_stores" ADD CONSTRAINT "hearing_external_stores_primary_collector_id_fkey" FOREIGN KEY ("primary_collector_id") REFERENCES "app"."collectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_external_stores" ADD CONSTRAINT "hearing_external_stores_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_external_stores" ADD CONSTRAINT "hearing_external_stores_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."store_items" ADD CONSTRAINT "store_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."store_items" ADD CONSTRAINT "store_items_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "app"."stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."store_items" ADD CONSTRAINT "store_items_assigned_collector_id_fkey" FOREIGN KEY ("assigned_collector_id") REFERENCES "app"."collectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."store_items" ADD CONSTRAINT "store_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."store_items" ADD CONSTRAINT "store_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_external_store_items" ADD CONSTRAINT "hearing_external_store_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_external_store_items" ADD CONSTRAINT "hearing_external_store_items_external_store_id_fkey" FOREIGN KEY ("external_store_id") REFERENCES "app"."hearing_external_stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_external_store_items" ADD CONSTRAINT "hearing_external_store_items_assigned_collector_id_fkey" FOREIGN KEY ("assigned_collector_id") REFERENCES "app"."collectors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_external_store_items" ADD CONSTRAINT "hearing_external_store_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_external_store_items" ADD CONSTRAINT "hearing_external_store_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_targets" ADD CONSTRAINT "hearing_targets_hearing_id_fkey" FOREIGN KEY ("hearing_id") REFERENCES "app"."hearings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_targets" ADD CONSTRAINT "hearing_targets_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "app"."collectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_targets" ADD CONSTRAINT "hearing_targets_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "app"."stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_targets" ADD CONSTRAINT "hearing_targets_external_store_id_fkey" FOREIGN KEY ("external_store_id") REFERENCES "app"."hearing_external_stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_targets" ADD CONSTRAINT "hearing_targets_store_item_id_fkey" FOREIGN KEY ("store_item_id") REFERENCES "app"."store_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_targets" ADD CONSTRAINT "hearing_targets_external_store_item_id_fkey" FOREIGN KEY ("external_store_item_id") REFERENCES "app"."hearing_external_store_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_responses" ADD CONSTRAINT "hearing_responses_hearing_target_id_fkey" FOREIGN KEY ("hearing_target_id") REFERENCES "app"."hearing_targets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_responses" ADD CONSTRAINT "hearing_responses_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_comments" ADD CONSTRAINT "hearing_comments_hearing_target_id_fkey" FOREIGN KEY ("hearing_target_id") REFERENCES "app"."hearing_targets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_comments" ADD CONSTRAINT "hearing_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_comments" ADD CONSTRAINT "hearing_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "app"."hearing_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_unlock_requests" ADD CONSTRAINT "hearing_unlock_requests_hearing_target_id_fkey" FOREIGN KEY ("hearing_target_id") REFERENCES "app"."hearing_targets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_unlock_requests" ADD CONSTRAINT "hearing_unlock_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_unlock_requests" ADD CONSTRAINT "hearing_unlock_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "app"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_reminders" ADD CONSTRAINT "hearing_reminders_hearing_id_fkey" FOREIGN KEY ("hearing_id") REFERENCES "app"."hearings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app"."hearing_reminders" ADD CONSTRAINT "hearing_reminders_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "app"."collectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

