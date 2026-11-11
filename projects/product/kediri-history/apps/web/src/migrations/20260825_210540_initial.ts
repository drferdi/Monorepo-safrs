import type { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres";
import { sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('id', 'en');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'publisher', 'historical_reviewer', 'editor', 'researcher', 'asset_curator');
  CREATE TYPE "public"."enum_rights_documents_rights_type" AS ENUM('institutional_permission', 'licence_agreement', 'subject_release', 'community_donation', 'public_domain_assessment');
  CREATE TYPE "public"."enum_media_assets_visual_evidence_class" AS ENUM('V0_primary_object', 'V1_documentary_historical_image', 'V2_verified_contemporary_documentation', 'V3_evidence_constrained_reconstruction', 'V4_artistic_interpretation', 'V5_folklore_visualization');
  CREATE TYPE "public"."enum_media_assets_rights_class" AS ENUM('R0_public_domain', 'R1_open_license', 'R2_institutional_use', 'R3_permission_required', 'R4_editorial_commercial_license', 'R5_reference_only');
  CREATE TYPE "public"."enum_media_assets_asset_status" AS ENUM('green', 'blue', 'amber', 'red', 'black');
  CREATE TYPE "public"."enum_media_assets_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__media_assets_v_version_visual_evidence_class" AS ENUM('V0_primary_object', 'V1_documentary_historical_image', 'V2_verified_contemporary_documentation', 'V3_evidence_constrained_reconstruction', 'V4_artistic_interpretation', 'V5_folklore_visualization');
  CREATE TYPE "public"."enum__media_assets_v_version_rights_class" AS ENUM('R0_public_domain', 'R1_open_license', 'R2_institutional_use', 'R3_permission_required', 'R4_editorial_commercial_license', 'R5_reference_only');
  CREATE TYPE "public"."enum__media_assets_v_version_asset_status" AS ENUM('green', 'blue', 'amber', 'red', 'black');
  CREATE TYPE "public"."enum__media_assets_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__media_assets_v_published_locale" AS ENUM('id', 'en');
  CREATE TYPE "public"."enum_sources_source_type" AS ENUM('inscription', 'manuscript', 'archival_document', 'law', 'government_record', 'official_statistics', 'museum_catalogue', 'photograph', 'map', 'academic_book', 'academic_article', 'thesis', 'newspaper', 'oral_history', 'corporate_record', 'community_archive', 'website');
  CREATE TYPE "public"."enum_sources_reliability_tier" AS ENUM('primary', 'peer_reviewed', 'institutional', 'reputable_secondary', 'popular', 'unverified');
  CREATE TYPE "public"."enum_sources_link_status" AS ENUM('active', 'superseded', 'withdrawn', 'broken_link');
  CREATE TYPE "public"."enum_sources_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__sources_v_version_source_type" AS ENUM('inscription', 'manuscript', 'archival_document', 'law', 'government_record', 'official_statistics', 'museum_catalogue', 'photograph', 'map', 'academic_book', 'academic_article', 'thesis', 'newspaper', 'oral_history', 'corporate_record', 'community_archive', 'website');
  CREATE TYPE "public"."enum__sources_v_version_reliability_tier" AS ENUM('primary', 'peer_reviewed', 'institutional', 'reputable_secondary', 'popular', 'unverified');
  CREATE TYPE "public"."enum__sources_v_version_link_status" AS ENUM('active', 'superseded', 'withdrawn', 'broken_link');
  CREATE TYPE "public"."enum__sources_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__sources_v_published_locale" AS ENUM('id', 'en');
  CREATE TYPE "public"."enum_people_birth_chronology_precision" AS ENUM('exact_day', 'month', 'year', 'range', 'decade', 'century', 'approximate');
  CREATE TYPE "public"."enum_people_death_chronology_precision" AS ENUM('exact_day', 'month', 'year', 'range', 'decade', 'century', 'approximate');
  CREATE TYPE "public"."enum_people_representation_policy" AS ENUM('authenticated_likeness', 'historical_photograph', 'period_portrait', 'symbolic_only', 'no_known_likeness');
  CREATE TYPE "public"."enum_people_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__people_v_version_birth_chronology_precision" AS ENUM('exact_day', 'month', 'year', 'range', 'decade', 'century', 'approximate');
  CREATE TYPE "public"."enum__people_v_version_death_chronology_precision" AS ENUM('exact_day', 'month', 'year', 'range', 'decade', 'century', 'approximate');
  CREATE TYPE "public"."enum__people_v_version_representation_policy" AS ENUM('authenticated_likeness', 'historical_photograph', 'period_portrait', 'symbolic_only', 'no_known_likeness');
  CREATE TYPE "public"."enum__people_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__people_v_published_locale" AS ENUM('id', 'en');
  CREATE TYPE "public"."enum_places_place_type" AS ENUM('city', 'region', 'river', 'kingdom', 'settlement', 'archaeological_site', 'building', 'bridge', 'religious_site', 'industrial_site', 'transport_site', 'landscape', 'uncertain_historical_location');
  CREATE TYPE "public"."enum_places_historical_location_certainty" AS ENUM('precise', 'approximate_zone', 'disputed', 'unknown');
  CREATE TYPE "public"."enum_places_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__places_v_version_place_type" AS ENUM('city', 'region', 'river', 'kingdom', 'settlement', 'archaeological_site', 'building', 'bridge', 'religious_site', 'industrial_site', 'transport_site', 'landscape', 'uncertain_historical_location');
  CREATE TYPE "public"."enum__places_v_version_historical_location_certainty" AS ENUM('precise', 'approximate_zone', 'disputed', 'unknown');
  CREATE TYPE "public"."enum__places_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__places_v_published_locale" AS ENUM('id', 'en');
  CREATE TYPE "public"."enum_artifacts_artifact_type" AS ENUM('inscription', 'manuscript', 'sculpture', 'architectural_element', 'coin', 'ceramic', 'tool', 'machine', 'document', 'photograph_object', 'textile', 'other');
  CREATE TYPE "public"."enum_artifacts_chronology_precision" AS ENUM('exact_day', 'month', 'year', 'range', 'decade', 'century', 'approximate');
  CREATE TYPE "public"."enum_artifacts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__artifacts_v_version_artifact_type" AS ENUM('inscription', 'manuscript', 'sculpture', 'architectural_element', 'coin', 'ceramic', 'tool', 'machine', 'document', 'photograph_object', 'textile', 'other');
  CREATE TYPE "public"."enum__artifacts_v_version_chronology_precision" AS ENUM('exact_day', 'month', 'year', 'range', 'decade', 'century', 'approximate');
  CREATE TYPE "public"."enum__artifacts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__artifacts_v_published_locale" AS ENUM('id', 'en');
  CREATE TYPE "public"."enum_themes_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__themes_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__themes_v_published_locale" AS ENUM('id', 'en');
  CREATE TYPE "public"."enum_events_chronology_precision" AS ENUM('exact_day', 'month', 'year', 'range', 'decade', 'century', 'approximate');
  CREATE TYPE "public"."enum_events_review_status" AS ENUM('researching', 'needs_review', 'reviewed', 'approved');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_version_chronology_precision" AS ENUM('exact_day', 'month', 'year', 'range', 'decade', 'century', 'approximate');
  CREATE TYPE "public"."enum__events_v_version_review_status" AS ENUM('researching', 'needs_review', 'reviewed', 'approved');
  CREATE TYPE "public"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_published_locale" AS ENUM('id', 'en');
  CREATE TYPE "public"."enum_evidence_claims_evidence_class" AS ENUM('primary_record', 'historical_fact', 'scholarly_interpretation', 'tradition', 'folklore', 'modern_verified_data');
  CREATE TYPE "public"."enum_evidence_claims_confidence" AS ENUM('high', 'moderate', 'low', 'contested');
  CREATE TYPE "public"."enum_evidence_claims_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__evidence_claims_v_version_evidence_class" AS ENUM('primary_record', 'historical_fact', 'scholarly_interpretation', 'tradition', 'folklore', 'modern_verified_data');
  CREATE TYPE "public"."enum__evidence_claims_v_version_confidence" AS ENUM('high', 'moderate', 'low', 'contested');
  CREATE TYPE "public"."enum__evidence_claims_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__evidence_claims_v_published_locale" AS ENUM('id', 'en');
  CREATE TYPE "public"."enum_evidence_links_role" AS ENUM('supports', 'contradicts', 'contextualizes', 'mentions');
  CREATE TYPE "public"."enum_evidence_links_strength" AS ENUM('direct', 'strong', 'moderate', 'weak');
  CREATE TYPE "public"."enum_evidence_links_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__evidence_links_v_version_role" AS ENUM('supports', 'contradicts', 'contextualizes', 'mentions');
  CREATE TYPE "public"."enum__evidence_links_v_version_strength" AS ENUM('direct', 'strong', 'moderate', 'weak');
  CREATE TYPE "public"."enum__evidence_links_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__evidence_links_v_published_locale" AS ENUM('id', 'en');
  CREATE TYPE "public"."enum_journey_acts_visual_era_key" AS ENUM('present', 'ancient', 'panjalu', 'collapse', 'memory', 'seventeenthCentury', 'colonialIndustrial', 'occupationRevolution', 'industrialCity', 'connectedModern', 'finale');
  CREATE TYPE "public"."enum_journey_acts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__journey_acts_v_version_visual_era_key" AS ENUM('present', 'ancient', 'panjalu', 'collapse', 'memory', 'seventeenthCentury', 'colonialIndustrial', 'occupationRevolution', 'industrialCity', 'connectedModern', 'finale');
  CREATE TYPE "public"."enum__journey_acts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__journey_acts_v_published_locale" AS ENUM('id', 'en');
  CREATE TYPE "public"."enum_scenes_evidence_badge_mode" AS ENUM('auto', 'always', 'hidden');
  CREATE TYPE "public"."enum_scenes_choreography_key" AS ENUM('inscriptionReveal', 'nameEmerges', 'dividedKingdom', 'royalConsolidation', 'manuscriptWorld', 'politicalFracture', 'bridgeConstruction', 'bridgeLift', 'revolutionMachine', 'industrialExpansion', 'runwayTransition');
  CREATE TYPE "public"."enum_scenes_scene_type" AS ENUM('hero', 'supporting', 'interlude', 'optional');
  CREATE TYPE "public"."enum_scenes_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__scenes_v_version_evidence_badge_mode" AS ENUM('auto', 'always', 'hidden');
  CREATE TYPE "public"."enum__scenes_v_version_choreography_key" AS ENUM('inscriptionReveal', 'nameEmerges', 'dividedKingdom', 'royalConsolidation', 'manuscriptWorld', 'politicalFracture', 'bridgeConstruction', 'bridgeLift', 'revolutionMachine', 'industrialExpansion', 'runwayTransition');
  CREATE TYPE "public"."enum__scenes_v_version_scene_type" AS ENUM('hero', 'supporting', 'interlude', 'optional');
  CREATE TYPE "public"."enum__scenes_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__scenes_v_published_locale" AS ENUM('id', 'en');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"display_name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'researcher' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "rights_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"rights_type" "enum_rights_documents_rights_type" NOT NULL,
  	"institution" varchar,
  	"effective_from" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "media_masters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"origin_institution" varchar NOT NULL,
  	"inventory_reference" varchar,
  	"source_url" varchar,
  	"checksum" varchar,
  	"rights_document_id" integer,
  	"approved" boolean DEFAULT false,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "media_assets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"alt_text" varchar,
  	"caption" varchar,
  	"visual_evidence_class" "enum_media_assets_visual_evidence_class",
  	"rights_class" "enum_media_assets_rights_class",
  	"master_id" integer,
  	"rights_document_id" integer,
  	"rights_expires_at" timestamp(3) with time zone,
  	"creator" varchar,
  	"institution" varchar,
  	"credit_line" varchar,
  	"date_created" varchar,
  	"date_depicted" varchar,
  	"context_note" varchar,
  	"uncertainty_note" varchar,
  	"asset_status" "enum_media_assets_asset_status" DEFAULT 'amber',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_media_assets_status" DEFAULT 'draft',
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "_media_assets_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_alt_text" varchar,
  	"version_caption" varchar,
  	"version_visual_evidence_class" "enum__media_assets_v_version_visual_evidence_class",
  	"version_rights_class" "enum__media_assets_v_version_rights_class",
  	"version_master_id" integer,
  	"version_rights_document_id" integer,
  	"version_rights_expires_at" timestamp(3) with time zone,
  	"version_creator" varchar,
  	"version_institution" varchar,
  	"version_credit_line" varchar,
  	"version_date_created" varchar,
  	"version_date_depicted" varchar,
  	"version_context_note" varchar,
  	"version_uncertainty_note" varchar,
  	"version_asset_status" "enum__media_assets_v_version_asset_status" DEFAULT 'amber',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__media_assets_v_version_status" DEFAULT 'draft',
  	"version_url" varchar,
  	"version_thumbnail_u_r_l" varchar,
  	"version_filename" varchar,
  	"version_mime_type" varchar,
  	"version_filesize" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version_focal_x" numeric,
  	"version_focal_y" numeric,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__media_assets_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "sources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"source_type" "enum_sources_source_type",
  	"institution" varchar,
  	"publisher" varchar,
  	"publication_year" numeric,
  	"language" varchar,
  	"reliability_tier" "enum_sources_reliability_tier",
  	"archive_collection" varchar,
  	"inventory_number" varchar,
  	"url" varchar,
  	"doi" varchar,
  	"isbn" varchar,
  	"citation" varchar,
  	"access_date" timestamp(3) with time zone,
  	"link_status" "enum_sources_link_status" DEFAULT 'active',
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_sources_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "sources_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_sources_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_source_type" "enum__sources_v_version_source_type",
  	"version_institution" varchar,
  	"version_publisher" varchar,
  	"version_publication_year" numeric,
  	"version_language" varchar,
  	"version_reliability_tier" "enum__sources_v_version_reliability_tier",
  	"version_archive_collection" varchar,
  	"version_inventory_number" varchar,
  	"version_url" varchar,
  	"version_doi" varchar,
  	"version_isbn" varchar,
  	"version_citation" varchar,
  	"version_access_date" timestamp(3) with time zone,
  	"version_link_status" "enum__sources_v_version_link_status" DEFAULT 'active',
  	"version_notes" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__sources_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__sources_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_sources_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "people" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"canonical_name" varchar,
  	"slug" varchar,
  	"display_name" varchar,
  	"birth_chronology_start_year" numeric,
  	"birth_chronology_start_month" numeric,
  	"birth_chronology_start_day" numeric,
  	"birth_chronology_end_year" numeric,
  	"birth_chronology_end_month" numeric,
  	"birth_chronology_end_day" numeric,
  	"birth_chronology_precision" "enum_people_birth_chronology_precision",
  	"birth_chronology_display" varchar,
  	"death_chronology_start_year" numeric,
  	"death_chronology_start_month" numeric,
  	"death_chronology_start_day" numeric,
  	"death_chronology_end_year" numeric,
  	"death_chronology_end_month" numeric,
  	"death_chronology_end_day" numeric,
  	"death_chronology_precision" "enum_people_death_chronology_precision",
  	"death_chronology_display" varchar,
  	"representation_policy" "enum_people_representation_policy" DEFAULT 'no_known_likeness',
  	"summary" varchar,
  	"biography" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_people_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "people_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_people_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_canonical_name" varchar,
  	"version_slug" varchar,
  	"version_display_name" varchar,
  	"version_birth_chronology_start_year" numeric,
  	"version_birth_chronology_start_month" numeric,
  	"version_birth_chronology_start_day" numeric,
  	"version_birth_chronology_end_year" numeric,
  	"version_birth_chronology_end_month" numeric,
  	"version_birth_chronology_end_day" numeric,
  	"version_birth_chronology_precision" "enum__people_v_version_birth_chronology_precision",
  	"version_birth_chronology_display" varchar,
  	"version_death_chronology_start_year" numeric,
  	"version_death_chronology_start_month" numeric,
  	"version_death_chronology_start_day" numeric,
  	"version_death_chronology_end_year" numeric,
  	"version_death_chronology_end_month" numeric,
  	"version_death_chronology_end_day" numeric,
  	"version_death_chronology_precision" "enum__people_v_version_death_chronology_precision",
  	"version_death_chronology_display" varchar,
  	"version_representation_policy" "enum__people_v_version_representation_policy" DEFAULT 'no_known_likeness',
  	"version_summary" varchar,
  	"version_biography" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__people_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__people_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_people_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "places" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"canonical_name" varchar,
  	"slug" varchar,
  	"place_type" "enum_places_place_type",
  	"modern_location_latitude" numeric,
  	"modern_location_longitude" numeric,
  	"modern_location_address_context" varchar,
  	"historical_location_certainty" "enum_places_historical_location_certainty" DEFAULT 'approximate_zone',
  	"historical_location_description" varchar,
  	"historical_location_geometry_reference" varchar,
  	"administrative_context" varchar,
  	"heritage_status" varchar,
  	"summary" varchar,
  	"history" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_places_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "places_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_places_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_canonical_name" varchar,
  	"version_slug" varchar,
  	"version_place_type" "enum__places_v_version_place_type",
  	"version_modern_location_latitude" numeric,
  	"version_modern_location_longitude" numeric,
  	"version_modern_location_address_context" varchar,
  	"version_historical_location_certainty" "enum__places_v_version_historical_location_certainty" DEFAULT 'approximate_zone',
  	"version_historical_location_description" varchar,
  	"version_historical_location_geometry_reference" varchar,
  	"version_administrative_context" varchar,
  	"version_heritage_status" varchar,
  	"version_summary" varchar,
  	"version_history" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__places_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__places_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_places_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "artifacts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"canonical_name" varchar,
  	"slug" varchar,
  	"artifact_type" "enum_artifacts_artifact_type",
  	"chronology_start_year" numeric,
  	"chronology_start_month" numeric,
  	"chronology_start_day" numeric,
  	"chronology_end_year" numeric,
  	"chronology_end_month" numeric,
  	"chronology_end_day" numeric,
  	"chronology_precision" "enum_artifacts_chronology_precision",
  	"chronology_display" varchar,
  	"material" varchar,
  	"dimensions" varchar,
  	"holding_institution" varchar,
  	"inventory_number" varchar,
  	"discovery_location_id" integer,
  	"current_location_id" integer,
  	"provenance" varchar,
  	"transcription" varchar,
  	"translation" varchar,
  	"summary" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_artifacts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "artifacts_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "artifacts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_assets_id" integer
  );
  
  CREATE TABLE "_artifacts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_canonical_name" varchar,
  	"version_slug" varchar,
  	"version_artifact_type" "enum__artifacts_v_version_artifact_type",
  	"version_chronology_start_year" numeric,
  	"version_chronology_start_month" numeric,
  	"version_chronology_start_day" numeric,
  	"version_chronology_end_year" numeric,
  	"version_chronology_end_month" numeric,
  	"version_chronology_end_day" numeric,
  	"version_chronology_precision" "enum__artifacts_v_version_chronology_precision",
  	"version_chronology_display" varchar,
  	"version_material" varchar,
  	"version_dimensions" varchar,
  	"version_holding_institution" varchar,
  	"version_inventory_number" varchar,
  	"version_discovery_location_id" integer,
  	"version_current_location_id" integer,
  	"version_provenance" varchar,
  	"version_transcription" varchar,
  	"version_translation" varchar,
  	"version_summary" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__artifacts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__artifacts_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_artifacts_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_artifacts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_assets_id" integer
  );
  
  CREATE TABLE "themes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"summary" varchar,
  	"description" jsonb,
  	"order" numeric DEFAULT 0,
  	"hero_media_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_themes_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_themes_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_description" jsonb,
  	"version_order" numeric DEFAULT 0,
  	"version_hero_media_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__themes_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__themes_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"canonical_name" varchar,
  	"slug" varchar,
  	"chronology_start_year" numeric,
  	"chronology_start_month" numeric,
  	"chronology_start_day" numeric,
  	"chronology_end_year" numeric,
  	"chronology_end_month" numeric,
  	"chronology_end_day" numeric,
  	"chronology_precision" "enum_events_chronology_precision",
  	"chronology_display" varchar,
  	"summary" varchar,
  	"description" jsonb,
  	"review_status" "enum_events_review_status" DEFAULT 'researching',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "events_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer,
  	"places_id" integer,
  	"artifacts_id" integer,
  	"themes_id" integer,
  	"evidence_claims_id" integer,
  	"events_id" integer
  );
  
  CREATE TABLE "_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_canonical_name" varchar,
  	"version_slug" varchar,
  	"version_chronology_start_year" numeric,
  	"version_chronology_start_month" numeric,
  	"version_chronology_start_day" numeric,
  	"version_chronology_end_year" numeric,
  	"version_chronology_end_month" numeric,
  	"version_chronology_end_day" numeric,
  	"version_chronology_precision" "enum__events_v_version_chronology_precision",
  	"version_chronology_display" varchar,
  	"version_summary" varchar,
  	"version_description" jsonb,
  	"version_review_status" "enum__events_v_version_review_status" DEFAULT 'researching',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__events_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_events_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_events_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer,
  	"places_id" integer,
  	"artifacts_id" integer,
  	"themes_id" integer,
  	"evidence_claims_id" integer,
  	"events_id" integer
  );
  
  CREATE TABLE "evidence_claims" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"canonical_statement" varchar,
  	"slug" varchar,
  	"public_summary" varchar,
  	"evidence_class" "enum_evidence_claims_evidence_class",
  	"confidence" "enum_evidence_claims_confidence" DEFAULT 'moderate',
  	"superseded_by_id" integer,
  	"editorial_notes" varchar,
  	"reviewed_by_id" integer,
  	"reviewed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_evidence_claims_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "evidence_claims_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"events_id" integer,
  	"people_id" integer,
  	"places_id" integer,
  	"artifacts_id" integer,
  	"evidence_claims_id" integer
  );
  
  CREATE TABLE "_evidence_claims_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_canonical_statement" varchar,
  	"version_slug" varchar,
  	"version_public_summary" varchar,
  	"version_evidence_class" "enum__evidence_claims_v_version_evidence_class",
  	"version_confidence" "enum__evidence_claims_v_version_confidence" DEFAULT 'moderate',
  	"version_superseded_by_id" integer,
  	"version_editorial_notes" varchar,
  	"version_reviewed_by_id" integer,
  	"version_reviewed_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__evidence_claims_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__evidence_claims_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_evidence_claims_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"events_id" integer,
  	"people_id" integer,
  	"places_id" integer,
  	"artifacts_id" integer,
  	"evidence_claims_id" integer
  );
  
  CREATE TABLE "evidence_links" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"claim_id" integer,
  	"source_id" integer,
  	"role" "enum_evidence_links_role" DEFAULT 'supports',
  	"strength" "enum_evidence_links_strength" DEFAULT 'moderate',
  	"locator" varchar,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_evidence_links_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_evidence_links_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_claim_id" integer,
  	"version_source_id" integer,
  	"version_role" "enum__evidence_links_v_version_role" DEFAULT 'supports',
  	"version_strength" "enum__evidence_links_v_version_strength" DEFAULT 'moderate',
  	"version_locator" varchar,
  	"version_note" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__evidence_links_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__evidence_links_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "journey_acts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" numeric,
  	"title" varchar,
  	"slug" varchar,
  	"subtitle" varchar,
  	"date_range_display" varchar,
  	"intro_copy" varchar,
  	"visual_era_key" "enum_journey_acts_visual_era_key",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_journey_acts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_journey_acts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_order" numeric,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_subtitle" varchar,
  	"version_date_range_display" varchar,
  	"version_intro_copy" varchar,
  	"version_visual_era_key" "enum__journey_acts_v_version_visual_era_key",
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__journey_acts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__journey_acts_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "scenes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" numeric,
  	"act_id" integer,
  	"title" varchar,
  	"slug" varchar,
  	"subtitle" varchar,
  	"date_display" varchar,
  	"primary_event_id" integer,
  	"narrative_short" varchar,
  	"narrative_long" jsonb,
  	"hero_media_id" integer,
  	"evidence_badge_mode" "enum_scenes_evidence_badge_mode" DEFAULT 'auto',
  	"choreography_key" "enum_scenes_choreography_key",
  	"scene_type" "enum_scenes_scene_type" DEFAULT 'supporting',
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_share_media_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_scenes_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "scenes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"events_id" integer,
  	"evidence_claims_id" integer,
  	"people_id" integer,
  	"places_id" integer,
  	"artifacts_id" integer,
  	"themes_id" integer,
  	"media_assets_id" integer
  );
  
  CREATE TABLE "_scenes_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_order" numeric,
  	"version_act_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_subtitle" varchar,
  	"version_date_display" varchar,
  	"version_primary_event_id" integer,
  	"version_narrative_short" varchar,
  	"version_narrative_long" jsonb,
  	"version_hero_media_id" integer,
  	"version_evidence_badge_mode" "enum__scenes_v_version_evidence_badge_mode" DEFAULT 'auto',
  	"version_choreography_key" "enum__scenes_v_version_choreography_key",
  	"version_scene_type" "enum__scenes_v_version_scene_type" DEFAULT 'supporting',
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_share_media_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__scenes_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__scenes_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_scenes_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"events_id" integer,
  	"evidence_claims_id" integer,
  	"people_id" integer,
  	"places_id" integer,
  	"artifacts_id" integer,
  	"themes_id" integer,
  	"media_assets_id" integer
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"rights_documents_id" integer,
  	"media_masters_id" integer,
  	"media_assets_id" integer,
  	"sources_id" integer,
  	"people_id" integer,
  	"places_id" integer,
  	"artifacts_id" integer,
  	"themes_id" integer,
  	"events_id" integer,
  	"evidence_claims_id" integer,
  	"evidence_links_id" integer,
  	"journey_acts_id" integer,
  	"scenes_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_masters" ADD CONSTRAINT "media_masters_rights_document_id_rights_documents_id_fk" FOREIGN KEY ("rights_document_id") REFERENCES "public"."rights_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_master_id_media_masters_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."media_masters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_rights_document_id_rights_documents_id_fk" FOREIGN KEY ("rights_document_id") REFERENCES "public"."rights_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_assets_v" ADD CONSTRAINT "_media_assets_v_parent_id_media_assets_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_assets_v" ADD CONSTRAINT "_media_assets_v_version_master_id_media_masters_id_fk" FOREIGN KEY ("version_master_id") REFERENCES "public"."media_masters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_assets_v" ADD CONSTRAINT "_media_assets_v_version_rights_document_id_rights_documents_id_fk" FOREIGN KEY ("version_rights_document_id") REFERENCES "public"."rights_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sources_texts" ADD CONSTRAINT "sources_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sources_v" ADD CONSTRAINT "_sources_v_parent_id_sources_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sources_v_texts" ADD CONSTRAINT "_sources_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_sources_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "people_texts" ADD CONSTRAINT "people_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_people_v" ADD CONSTRAINT "_people_v_parent_id_people_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_people_v_texts" ADD CONSTRAINT "_people_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_people_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "places_texts" ADD CONSTRAINT "places_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v" ADD CONSTRAINT "_places_v_parent_id_places_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_places_v_texts" ADD CONSTRAINT "_places_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_discovery_location_id_places_id_fk" FOREIGN KEY ("discovery_location_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_current_location_id_places_id_fk" FOREIGN KEY ("current_location_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "artifacts_texts" ADD CONSTRAINT "artifacts_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artifacts_rels" ADD CONSTRAINT "artifacts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artifacts_rels" ADD CONSTRAINT "artifacts_rels_media_assets_fk" FOREIGN KEY ("media_assets_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artifacts_v" ADD CONSTRAINT "_artifacts_v_parent_id_artifacts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artifacts_v" ADD CONSTRAINT "_artifacts_v_version_discovery_location_id_places_id_fk" FOREIGN KEY ("version_discovery_location_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artifacts_v" ADD CONSTRAINT "_artifacts_v_version_current_location_id_places_id_fk" FOREIGN KEY ("version_current_location_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artifacts_v_texts" ADD CONSTRAINT "_artifacts_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_artifacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artifacts_v_rels" ADD CONSTRAINT "_artifacts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_artifacts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artifacts_v_rels" ADD CONSTRAINT "_artifacts_v_rels_media_assets_fk" FOREIGN KEY ("media_assets_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "themes" ADD CONSTRAINT "themes_hero_media_id_media_assets_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_themes_v" ADD CONSTRAINT "_themes_v_parent_id_themes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_themes_v" ADD CONSTRAINT "_themes_v_version_hero_media_id_media_assets_id_fk" FOREIGN KEY ("version_hero_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_texts" ADD CONSTRAINT "events_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_places_fk" FOREIGN KEY ("places_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_artifacts_fk" FOREIGN KEY ("artifacts_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_themes_fk" FOREIGN KEY ("themes_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_evidence_claims_fk" FOREIGN KEY ("evidence_claims_id") REFERENCES "public"."evidence_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_texts" ADD CONSTRAINT "_events_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_places_fk" FOREIGN KEY ("places_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_artifacts_fk" FOREIGN KEY ("artifacts_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_themes_fk" FOREIGN KEY ("themes_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_evidence_claims_fk" FOREIGN KEY ("evidence_claims_id") REFERENCES "public"."evidence_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "evidence_claims" ADD CONSTRAINT "evidence_claims_superseded_by_id_evidence_claims_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."evidence_claims"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "evidence_claims" ADD CONSTRAINT "evidence_claims_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "evidence_claims_rels" ADD CONSTRAINT "evidence_claims_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."evidence_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "evidence_claims_rels" ADD CONSTRAINT "evidence_claims_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "evidence_claims_rels" ADD CONSTRAINT "evidence_claims_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "evidence_claims_rels" ADD CONSTRAINT "evidence_claims_rels_places_fk" FOREIGN KEY ("places_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "evidence_claims_rels" ADD CONSTRAINT "evidence_claims_rels_artifacts_fk" FOREIGN KEY ("artifacts_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "evidence_claims_rels" ADD CONSTRAINT "evidence_claims_rels_evidence_claims_fk" FOREIGN KEY ("evidence_claims_id") REFERENCES "public"."evidence_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_evidence_claims_v" ADD CONSTRAINT "_evidence_claims_v_parent_id_evidence_claims_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."evidence_claims"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_evidence_claims_v" ADD CONSTRAINT "_evidence_claims_v_version_superseded_by_id_evidence_claims_id_fk" FOREIGN KEY ("version_superseded_by_id") REFERENCES "public"."evidence_claims"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_evidence_claims_v" ADD CONSTRAINT "_evidence_claims_v_version_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_evidence_claims_v_rels" ADD CONSTRAINT "_evidence_claims_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_evidence_claims_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_evidence_claims_v_rels" ADD CONSTRAINT "_evidence_claims_v_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_evidence_claims_v_rels" ADD CONSTRAINT "_evidence_claims_v_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_evidence_claims_v_rels" ADD CONSTRAINT "_evidence_claims_v_rels_places_fk" FOREIGN KEY ("places_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_evidence_claims_v_rels" ADD CONSTRAINT "_evidence_claims_v_rels_artifacts_fk" FOREIGN KEY ("artifacts_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_evidence_claims_v_rels" ADD CONSTRAINT "_evidence_claims_v_rels_evidence_claims_fk" FOREIGN KEY ("evidence_claims_id") REFERENCES "public"."evidence_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_claim_id_evidence_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."evidence_claims"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_evidence_links_v" ADD CONSTRAINT "_evidence_links_v_parent_id_evidence_links_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."evidence_links"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_evidence_links_v" ADD CONSTRAINT "_evidence_links_v_version_claim_id_evidence_claims_id_fk" FOREIGN KEY ("version_claim_id") REFERENCES "public"."evidence_claims"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_evidence_links_v" ADD CONSTRAINT "_evidence_links_v_version_source_id_sources_id_fk" FOREIGN KEY ("version_source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_journey_acts_v" ADD CONSTRAINT "_journey_acts_v_parent_id_journey_acts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."journey_acts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scenes" ADD CONSTRAINT "scenes_act_id_journey_acts_id_fk" FOREIGN KEY ("act_id") REFERENCES "public"."journey_acts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scenes" ADD CONSTRAINT "scenes_primary_event_id_events_id_fk" FOREIGN KEY ("primary_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scenes" ADD CONSTRAINT "scenes_hero_media_id_media_assets_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scenes" ADD CONSTRAINT "scenes_seo_share_media_id_media_assets_id_fk" FOREIGN KEY ("seo_share_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scenes_rels" ADD CONSTRAINT "scenes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scenes_rels" ADD CONSTRAINT "scenes_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scenes_rels" ADD CONSTRAINT "scenes_rels_evidence_claims_fk" FOREIGN KEY ("evidence_claims_id") REFERENCES "public"."evidence_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scenes_rels" ADD CONSTRAINT "scenes_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scenes_rels" ADD CONSTRAINT "scenes_rels_places_fk" FOREIGN KEY ("places_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scenes_rels" ADD CONSTRAINT "scenes_rels_artifacts_fk" FOREIGN KEY ("artifacts_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scenes_rels" ADD CONSTRAINT "scenes_rels_themes_fk" FOREIGN KEY ("themes_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scenes_rels" ADD CONSTRAINT "scenes_rels_media_assets_fk" FOREIGN KEY ("media_assets_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_scenes_v" ADD CONSTRAINT "_scenes_v_parent_id_scenes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."scenes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_scenes_v" ADD CONSTRAINT "_scenes_v_version_act_id_journey_acts_id_fk" FOREIGN KEY ("version_act_id") REFERENCES "public"."journey_acts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_scenes_v" ADD CONSTRAINT "_scenes_v_version_primary_event_id_events_id_fk" FOREIGN KEY ("version_primary_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_scenes_v" ADD CONSTRAINT "_scenes_v_version_hero_media_id_media_assets_id_fk" FOREIGN KEY ("version_hero_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_scenes_v" ADD CONSTRAINT "_scenes_v_version_seo_share_media_id_media_assets_id_fk" FOREIGN KEY ("version_seo_share_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_scenes_v_rels" ADD CONSTRAINT "_scenes_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_scenes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_scenes_v_rels" ADD CONSTRAINT "_scenes_v_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_scenes_v_rels" ADD CONSTRAINT "_scenes_v_rels_evidence_claims_fk" FOREIGN KEY ("evidence_claims_id") REFERENCES "public"."evidence_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_scenes_v_rels" ADD CONSTRAINT "_scenes_v_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_scenes_v_rels" ADD CONSTRAINT "_scenes_v_rels_places_fk" FOREIGN KEY ("places_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_scenes_v_rels" ADD CONSTRAINT "_scenes_v_rels_artifacts_fk" FOREIGN KEY ("artifacts_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_scenes_v_rels" ADD CONSTRAINT "_scenes_v_rels_themes_fk" FOREIGN KEY ("themes_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_scenes_v_rels" ADD CONSTRAINT "_scenes_v_rels_media_assets_fk" FOREIGN KEY ("media_assets_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rights_documents_fk" FOREIGN KEY ("rights_documents_id") REFERENCES "public"."rights_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_masters_fk" FOREIGN KEY ("media_masters_id") REFERENCES "public"."media_masters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_assets_fk" FOREIGN KEY ("media_assets_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_places_fk" FOREIGN KEY ("places_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_artifacts_fk" FOREIGN KEY ("artifacts_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_themes_fk" FOREIGN KEY ("themes_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_evidence_claims_fk" FOREIGN KEY ("evidence_claims_id") REFERENCES "public"."evidence_claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_evidence_links_fk" FOREIGN KEY ("evidence_links_id") REFERENCES "public"."evidence_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_journey_acts_fk" FOREIGN KEY ("journey_acts_id") REFERENCES "public"."journey_acts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_scenes_fk" FOREIGN KEY ("scenes_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "rights_documents_updated_at_idx" ON "rights_documents" USING btree ("updated_at");
  CREATE INDEX "rights_documents_created_at_idx" ON "rights_documents" USING btree ("created_at");
  CREATE UNIQUE INDEX "rights_documents_filename_idx" ON "rights_documents" USING btree ("filename");
  CREATE INDEX "media_masters_rights_document_idx" ON "media_masters" USING btree ("rights_document_id");
  CREATE INDEX "media_masters_updated_at_idx" ON "media_masters" USING btree ("updated_at");
  CREATE INDEX "media_masters_created_at_idx" ON "media_masters" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_masters_filename_idx" ON "media_masters" USING btree ("filename");
  CREATE INDEX "media_assets_master_idx" ON "media_assets" USING btree ("master_id");
  CREATE INDEX "media_assets_rights_document_idx" ON "media_assets" USING btree ("rights_document_id");
  CREATE INDEX "media_assets_updated_at_idx" ON "media_assets" USING btree ("updated_at");
  CREATE INDEX "media_assets_created_at_idx" ON "media_assets" USING btree ("created_at");
  CREATE INDEX "media_assets__status_idx" ON "media_assets" USING btree ("_status");
  CREATE UNIQUE INDEX "media_assets_filename_idx" ON "media_assets" USING btree ("filename");
  CREATE INDEX "_media_assets_v_parent_idx" ON "_media_assets_v" USING btree ("parent_id");
  CREATE INDEX "_media_assets_v_version_version_master_idx" ON "_media_assets_v" USING btree ("version_master_id");
  CREATE INDEX "_media_assets_v_version_version_rights_document_idx" ON "_media_assets_v" USING btree ("version_rights_document_id");
  CREATE INDEX "_media_assets_v_version_version_updated_at_idx" ON "_media_assets_v" USING btree ("version_updated_at");
  CREATE INDEX "_media_assets_v_version_version_created_at_idx" ON "_media_assets_v" USING btree ("version_created_at");
  CREATE INDEX "_media_assets_v_version_version__status_idx" ON "_media_assets_v" USING btree ("version__status");
  CREATE INDEX "_media_assets_v_version_version_filename_idx" ON "_media_assets_v" USING btree ("version_filename");
  CREATE INDEX "_media_assets_v_created_at_idx" ON "_media_assets_v" USING btree ("created_at");
  CREATE INDEX "_media_assets_v_updated_at_idx" ON "_media_assets_v" USING btree ("updated_at");
  CREATE INDEX "_media_assets_v_snapshot_idx" ON "_media_assets_v" USING btree ("snapshot");
  CREATE INDEX "_media_assets_v_published_locale_idx" ON "_media_assets_v" USING btree ("published_locale");
  CREATE INDEX "_media_assets_v_latest_idx" ON "_media_assets_v" USING btree ("latest");
  CREATE INDEX "sources_updated_at_idx" ON "sources" USING btree ("updated_at");
  CREATE INDEX "sources_created_at_idx" ON "sources" USING btree ("created_at");
  CREATE INDEX "sources__status_idx" ON "sources" USING btree ("_status");
  CREATE INDEX "sources_texts_order_parent" ON "sources_texts" USING btree ("order","parent_id");
  CREATE INDEX "_sources_v_parent_idx" ON "_sources_v" USING btree ("parent_id");
  CREATE INDEX "_sources_v_version_version_updated_at_idx" ON "_sources_v" USING btree ("version_updated_at");
  CREATE INDEX "_sources_v_version_version_created_at_idx" ON "_sources_v" USING btree ("version_created_at");
  CREATE INDEX "_sources_v_version_version__status_idx" ON "_sources_v" USING btree ("version__status");
  CREATE INDEX "_sources_v_created_at_idx" ON "_sources_v" USING btree ("created_at");
  CREATE INDEX "_sources_v_updated_at_idx" ON "_sources_v" USING btree ("updated_at");
  CREATE INDEX "_sources_v_snapshot_idx" ON "_sources_v" USING btree ("snapshot");
  CREATE INDEX "_sources_v_published_locale_idx" ON "_sources_v" USING btree ("published_locale");
  CREATE INDEX "_sources_v_latest_idx" ON "_sources_v" USING btree ("latest");
  CREATE INDEX "_sources_v_texts_order_parent" ON "_sources_v_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "people_slug_idx" ON "people" USING btree ("slug");
  CREATE INDEX "people_updated_at_idx" ON "people" USING btree ("updated_at");
  CREATE INDEX "people_created_at_idx" ON "people" USING btree ("created_at");
  CREATE INDEX "people__status_idx" ON "people" USING btree ("_status");
  CREATE INDEX "people_texts_order_parent" ON "people_texts" USING btree ("order","parent_id");
  CREATE INDEX "_people_v_parent_idx" ON "_people_v" USING btree ("parent_id");
  CREATE INDEX "_people_v_version_version_slug_idx" ON "_people_v" USING btree ("version_slug");
  CREATE INDEX "_people_v_version_version_updated_at_idx" ON "_people_v" USING btree ("version_updated_at");
  CREATE INDEX "_people_v_version_version_created_at_idx" ON "_people_v" USING btree ("version_created_at");
  CREATE INDEX "_people_v_version_version__status_idx" ON "_people_v" USING btree ("version__status");
  CREATE INDEX "_people_v_created_at_idx" ON "_people_v" USING btree ("created_at");
  CREATE INDEX "_people_v_updated_at_idx" ON "_people_v" USING btree ("updated_at");
  CREATE INDEX "_people_v_snapshot_idx" ON "_people_v" USING btree ("snapshot");
  CREATE INDEX "_people_v_published_locale_idx" ON "_people_v" USING btree ("published_locale");
  CREATE INDEX "_people_v_latest_idx" ON "_people_v" USING btree ("latest");
  CREATE INDEX "_people_v_texts_order_parent" ON "_people_v_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "places_slug_idx" ON "places" USING btree ("slug");
  CREATE INDEX "places_updated_at_idx" ON "places" USING btree ("updated_at");
  CREATE INDEX "places_created_at_idx" ON "places" USING btree ("created_at");
  CREATE INDEX "places__status_idx" ON "places" USING btree ("_status");
  CREATE INDEX "places_texts_order_parent" ON "places_texts" USING btree ("order","parent_id");
  CREATE INDEX "_places_v_parent_idx" ON "_places_v" USING btree ("parent_id");
  CREATE INDEX "_places_v_version_version_slug_idx" ON "_places_v" USING btree ("version_slug");
  CREATE INDEX "_places_v_version_version_updated_at_idx" ON "_places_v" USING btree ("version_updated_at");
  CREATE INDEX "_places_v_version_version_created_at_idx" ON "_places_v" USING btree ("version_created_at");
  CREATE INDEX "_places_v_version_version__status_idx" ON "_places_v" USING btree ("version__status");
  CREATE INDEX "_places_v_created_at_idx" ON "_places_v" USING btree ("created_at");
  CREATE INDEX "_places_v_updated_at_idx" ON "_places_v" USING btree ("updated_at");
  CREATE INDEX "_places_v_snapshot_idx" ON "_places_v" USING btree ("snapshot");
  CREATE INDEX "_places_v_published_locale_idx" ON "_places_v" USING btree ("published_locale");
  CREATE INDEX "_places_v_latest_idx" ON "_places_v" USING btree ("latest");
  CREATE INDEX "_places_v_texts_order_parent" ON "_places_v_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "artifacts_slug_idx" ON "artifacts" USING btree ("slug");
  CREATE INDEX "artifacts_discovery_location_idx" ON "artifacts" USING btree ("discovery_location_id");
  CREATE INDEX "artifacts_current_location_idx" ON "artifacts" USING btree ("current_location_id");
  CREATE INDEX "artifacts_updated_at_idx" ON "artifacts" USING btree ("updated_at");
  CREATE INDEX "artifacts_created_at_idx" ON "artifacts" USING btree ("created_at");
  CREATE INDEX "artifacts__status_idx" ON "artifacts" USING btree ("_status");
  CREATE INDEX "artifacts_texts_order_parent" ON "artifacts_texts" USING btree ("order","parent_id");
  CREATE INDEX "artifacts_rels_order_idx" ON "artifacts_rels" USING btree ("order");
  CREATE INDEX "artifacts_rels_parent_idx" ON "artifacts_rels" USING btree ("parent_id");
  CREATE INDEX "artifacts_rels_path_idx" ON "artifacts_rels" USING btree ("path");
  CREATE INDEX "artifacts_rels_media_assets_id_idx" ON "artifacts_rels" USING btree ("media_assets_id");
  CREATE INDEX "_artifacts_v_parent_idx" ON "_artifacts_v" USING btree ("parent_id");
  CREATE INDEX "_artifacts_v_version_version_slug_idx" ON "_artifacts_v" USING btree ("version_slug");
  CREATE INDEX "_artifacts_v_version_version_discovery_location_idx" ON "_artifacts_v" USING btree ("version_discovery_location_id");
  CREATE INDEX "_artifacts_v_version_version_current_location_idx" ON "_artifacts_v" USING btree ("version_current_location_id");
  CREATE INDEX "_artifacts_v_version_version_updated_at_idx" ON "_artifacts_v" USING btree ("version_updated_at");
  CREATE INDEX "_artifacts_v_version_version_created_at_idx" ON "_artifacts_v" USING btree ("version_created_at");
  CREATE INDEX "_artifacts_v_version_version__status_idx" ON "_artifacts_v" USING btree ("version__status");
  CREATE INDEX "_artifacts_v_created_at_idx" ON "_artifacts_v" USING btree ("created_at");
  CREATE INDEX "_artifacts_v_updated_at_idx" ON "_artifacts_v" USING btree ("updated_at");
  CREATE INDEX "_artifacts_v_snapshot_idx" ON "_artifacts_v" USING btree ("snapshot");
  CREATE INDEX "_artifacts_v_published_locale_idx" ON "_artifacts_v" USING btree ("published_locale");
  CREATE INDEX "_artifacts_v_latest_idx" ON "_artifacts_v" USING btree ("latest");
  CREATE INDEX "_artifacts_v_texts_order_parent" ON "_artifacts_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_artifacts_v_rels_order_idx" ON "_artifacts_v_rels" USING btree ("order");
  CREATE INDEX "_artifacts_v_rels_parent_idx" ON "_artifacts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_artifacts_v_rels_path_idx" ON "_artifacts_v_rels" USING btree ("path");
  CREATE INDEX "_artifacts_v_rels_media_assets_id_idx" ON "_artifacts_v_rels" USING btree ("media_assets_id");
  CREATE UNIQUE INDEX "themes_slug_idx" ON "themes" USING btree ("slug");
  CREATE INDEX "themes_hero_media_idx" ON "themes" USING btree ("hero_media_id");
  CREATE INDEX "themes_updated_at_idx" ON "themes" USING btree ("updated_at");
  CREATE INDEX "themes_created_at_idx" ON "themes" USING btree ("created_at");
  CREATE INDEX "themes__status_idx" ON "themes" USING btree ("_status");
  CREATE INDEX "_themes_v_parent_idx" ON "_themes_v" USING btree ("parent_id");
  CREATE INDEX "_themes_v_version_version_slug_idx" ON "_themes_v" USING btree ("version_slug");
  CREATE INDEX "_themes_v_version_version_hero_media_idx" ON "_themes_v" USING btree ("version_hero_media_id");
  CREATE INDEX "_themes_v_version_version_updated_at_idx" ON "_themes_v" USING btree ("version_updated_at");
  CREATE INDEX "_themes_v_version_version_created_at_idx" ON "_themes_v" USING btree ("version_created_at");
  CREATE INDEX "_themes_v_version_version__status_idx" ON "_themes_v" USING btree ("version__status");
  CREATE INDEX "_themes_v_created_at_idx" ON "_themes_v" USING btree ("created_at");
  CREATE INDEX "_themes_v_updated_at_idx" ON "_themes_v" USING btree ("updated_at");
  CREATE INDEX "_themes_v_snapshot_idx" ON "_themes_v" USING btree ("snapshot");
  CREATE INDEX "_themes_v_published_locale_idx" ON "_themes_v" USING btree ("published_locale");
  CREATE INDEX "_themes_v_latest_idx" ON "_themes_v" USING btree ("latest");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events__status_idx" ON "events" USING btree ("_status");
  CREATE INDEX "events_texts_order_parent" ON "events_texts" USING btree ("order","parent_id");
  CREATE INDEX "events_rels_order_idx" ON "events_rels" USING btree ("order");
  CREATE INDEX "events_rels_parent_idx" ON "events_rels" USING btree ("parent_id");
  CREATE INDEX "events_rels_path_idx" ON "events_rels" USING btree ("path");
  CREATE INDEX "events_rels_people_id_idx" ON "events_rels" USING btree ("people_id");
  CREATE INDEX "events_rels_places_id_idx" ON "events_rels" USING btree ("places_id");
  CREATE INDEX "events_rels_artifacts_id_idx" ON "events_rels" USING btree ("artifacts_id");
  CREATE INDEX "events_rels_themes_id_idx" ON "events_rels" USING btree ("themes_id");
  CREATE INDEX "events_rels_evidence_claims_id_idx" ON "events_rels" USING btree ("evidence_claims_id");
  CREATE INDEX "events_rels_events_id_idx" ON "events_rels" USING btree ("events_id");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_snapshot_idx" ON "_events_v" USING btree ("snapshot");
  CREATE INDEX "_events_v_published_locale_idx" ON "_events_v" USING btree ("published_locale");
  CREATE INDEX "_events_v_latest_idx" ON "_events_v" USING btree ("latest");
  CREATE INDEX "_events_v_texts_order_parent" ON "_events_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_events_v_rels_order_idx" ON "_events_v_rels" USING btree ("order");
  CREATE INDEX "_events_v_rels_parent_idx" ON "_events_v_rels" USING btree ("parent_id");
  CREATE INDEX "_events_v_rels_path_idx" ON "_events_v_rels" USING btree ("path");
  CREATE INDEX "_events_v_rels_people_id_idx" ON "_events_v_rels" USING btree ("people_id");
  CREATE INDEX "_events_v_rels_places_id_idx" ON "_events_v_rels" USING btree ("places_id");
  CREATE INDEX "_events_v_rels_artifacts_id_idx" ON "_events_v_rels" USING btree ("artifacts_id");
  CREATE INDEX "_events_v_rels_themes_id_idx" ON "_events_v_rels" USING btree ("themes_id");
  CREATE INDEX "_events_v_rels_evidence_claims_id_idx" ON "_events_v_rels" USING btree ("evidence_claims_id");
  CREATE INDEX "_events_v_rels_events_id_idx" ON "_events_v_rels" USING btree ("events_id");
  CREATE UNIQUE INDEX "evidence_claims_slug_idx" ON "evidence_claims" USING btree ("slug");
  CREATE INDEX "evidence_claims_superseded_by_idx" ON "evidence_claims" USING btree ("superseded_by_id");
  CREATE INDEX "evidence_claims_reviewed_by_idx" ON "evidence_claims" USING btree ("reviewed_by_id");
  CREATE INDEX "evidence_claims_updated_at_idx" ON "evidence_claims" USING btree ("updated_at");
  CREATE INDEX "evidence_claims_created_at_idx" ON "evidence_claims" USING btree ("created_at");
  CREATE INDEX "evidence_claims__status_idx" ON "evidence_claims" USING btree ("_status");
  CREATE INDEX "evidence_claims_rels_order_idx" ON "evidence_claims_rels" USING btree ("order");
  CREATE INDEX "evidence_claims_rels_parent_idx" ON "evidence_claims_rels" USING btree ("parent_id");
  CREATE INDEX "evidence_claims_rels_path_idx" ON "evidence_claims_rels" USING btree ("path");
  CREATE INDEX "evidence_claims_rels_events_id_idx" ON "evidence_claims_rels" USING btree ("events_id");
  CREATE INDEX "evidence_claims_rels_people_id_idx" ON "evidence_claims_rels" USING btree ("people_id");
  CREATE INDEX "evidence_claims_rels_places_id_idx" ON "evidence_claims_rels" USING btree ("places_id");
  CREATE INDEX "evidence_claims_rels_artifacts_id_idx" ON "evidence_claims_rels" USING btree ("artifacts_id");
  CREATE INDEX "evidence_claims_rels_evidence_claims_id_idx" ON "evidence_claims_rels" USING btree ("evidence_claims_id");
  CREATE INDEX "_evidence_claims_v_parent_idx" ON "_evidence_claims_v" USING btree ("parent_id");
  CREATE INDEX "_evidence_claims_v_version_version_slug_idx" ON "_evidence_claims_v" USING btree ("version_slug");
  CREATE INDEX "_evidence_claims_v_version_version_superseded_by_idx" ON "_evidence_claims_v" USING btree ("version_superseded_by_id");
  CREATE INDEX "_evidence_claims_v_version_version_reviewed_by_idx" ON "_evidence_claims_v" USING btree ("version_reviewed_by_id");
  CREATE INDEX "_evidence_claims_v_version_version_updated_at_idx" ON "_evidence_claims_v" USING btree ("version_updated_at");
  CREATE INDEX "_evidence_claims_v_version_version_created_at_idx" ON "_evidence_claims_v" USING btree ("version_created_at");
  CREATE INDEX "_evidence_claims_v_version_version__status_idx" ON "_evidence_claims_v" USING btree ("version__status");
  CREATE INDEX "_evidence_claims_v_created_at_idx" ON "_evidence_claims_v" USING btree ("created_at");
  CREATE INDEX "_evidence_claims_v_updated_at_idx" ON "_evidence_claims_v" USING btree ("updated_at");
  CREATE INDEX "_evidence_claims_v_snapshot_idx" ON "_evidence_claims_v" USING btree ("snapshot");
  CREATE INDEX "_evidence_claims_v_published_locale_idx" ON "_evidence_claims_v" USING btree ("published_locale");
  CREATE INDEX "_evidence_claims_v_latest_idx" ON "_evidence_claims_v" USING btree ("latest");
  CREATE INDEX "_evidence_claims_v_rels_order_idx" ON "_evidence_claims_v_rels" USING btree ("order");
  CREATE INDEX "_evidence_claims_v_rels_parent_idx" ON "_evidence_claims_v_rels" USING btree ("parent_id");
  CREATE INDEX "_evidence_claims_v_rels_path_idx" ON "_evidence_claims_v_rels" USING btree ("path");
  CREATE INDEX "_evidence_claims_v_rels_events_id_idx" ON "_evidence_claims_v_rels" USING btree ("events_id");
  CREATE INDEX "_evidence_claims_v_rels_people_id_idx" ON "_evidence_claims_v_rels" USING btree ("people_id");
  CREATE INDEX "_evidence_claims_v_rels_places_id_idx" ON "_evidence_claims_v_rels" USING btree ("places_id");
  CREATE INDEX "_evidence_claims_v_rels_artifacts_id_idx" ON "_evidence_claims_v_rels" USING btree ("artifacts_id");
  CREATE INDEX "_evidence_claims_v_rels_evidence_claims_id_idx" ON "_evidence_claims_v_rels" USING btree ("evidence_claims_id");
  CREATE INDEX "evidence_links_claim_idx" ON "evidence_links" USING btree ("claim_id");
  CREATE INDEX "evidence_links_source_idx" ON "evidence_links" USING btree ("source_id");
  CREATE INDEX "evidence_links_updated_at_idx" ON "evidence_links" USING btree ("updated_at");
  CREATE INDEX "evidence_links_created_at_idx" ON "evidence_links" USING btree ("created_at");
  CREATE INDEX "evidence_links__status_idx" ON "evidence_links" USING btree ("_status");
  CREATE INDEX "_evidence_links_v_parent_idx" ON "_evidence_links_v" USING btree ("parent_id");
  CREATE INDEX "_evidence_links_v_version_version_claim_idx" ON "_evidence_links_v" USING btree ("version_claim_id");
  CREATE INDEX "_evidence_links_v_version_version_source_idx" ON "_evidence_links_v" USING btree ("version_source_id");
  CREATE INDEX "_evidence_links_v_version_version_updated_at_idx" ON "_evidence_links_v" USING btree ("version_updated_at");
  CREATE INDEX "_evidence_links_v_version_version_created_at_idx" ON "_evidence_links_v" USING btree ("version_created_at");
  CREATE INDEX "_evidence_links_v_version_version__status_idx" ON "_evidence_links_v" USING btree ("version__status");
  CREATE INDEX "_evidence_links_v_created_at_idx" ON "_evidence_links_v" USING btree ("created_at");
  CREATE INDEX "_evidence_links_v_updated_at_idx" ON "_evidence_links_v" USING btree ("updated_at");
  CREATE INDEX "_evidence_links_v_snapshot_idx" ON "_evidence_links_v" USING btree ("snapshot");
  CREATE INDEX "_evidence_links_v_published_locale_idx" ON "_evidence_links_v" USING btree ("published_locale");
  CREATE INDEX "_evidence_links_v_latest_idx" ON "_evidence_links_v" USING btree ("latest");
  CREATE UNIQUE INDEX "journey_acts_order_idx" ON "journey_acts" USING btree ("order");
  CREATE UNIQUE INDEX "journey_acts_slug_idx" ON "journey_acts" USING btree ("slug");
  CREATE INDEX "journey_acts_updated_at_idx" ON "journey_acts" USING btree ("updated_at");
  CREATE INDEX "journey_acts_created_at_idx" ON "journey_acts" USING btree ("created_at");
  CREATE INDEX "journey_acts__status_idx" ON "journey_acts" USING btree ("_status");
  CREATE INDEX "_journey_acts_v_parent_idx" ON "_journey_acts_v" USING btree ("parent_id");
  CREATE INDEX "_journey_acts_v_version_version_order_idx" ON "_journey_acts_v" USING btree ("version_order");
  CREATE INDEX "_journey_acts_v_version_version_slug_idx" ON "_journey_acts_v" USING btree ("version_slug");
  CREATE INDEX "_journey_acts_v_version_version_updated_at_idx" ON "_journey_acts_v" USING btree ("version_updated_at");
  CREATE INDEX "_journey_acts_v_version_version_created_at_idx" ON "_journey_acts_v" USING btree ("version_created_at");
  CREATE INDEX "_journey_acts_v_version_version__status_idx" ON "_journey_acts_v" USING btree ("version__status");
  CREATE INDEX "_journey_acts_v_created_at_idx" ON "_journey_acts_v" USING btree ("created_at");
  CREATE INDEX "_journey_acts_v_updated_at_idx" ON "_journey_acts_v" USING btree ("updated_at");
  CREATE INDEX "_journey_acts_v_snapshot_idx" ON "_journey_acts_v" USING btree ("snapshot");
  CREATE INDEX "_journey_acts_v_published_locale_idx" ON "_journey_acts_v" USING btree ("published_locale");
  CREATE INDEX "_journey_acts_v_latest_idx" ON "_journey_acts_v" USING btree ("latest");
  CREATE INDEX "scenes_act_idx" ON "scenes" USING btree ("act_id");
  CREATE UNIQUE INDEX "scenes_slug_idx" ON "scenes" USING btree ("slug");
  CREATE INDEX "scenes_primary_event_idx" ON "scenes" USING btree ("primary_event_id");
  CREATE INDEX "scenes_hero_media_idx" ON "scenes" USING btree ("hero_media_id");
  CREATE INDEX "scenes_seo_seo_share_media_idx" ON "scenes" USING btree ("seo_share_media_id");
  CREATE INDEX "scenes_updated_at_idx" ON "scenes" USING btree ("updated_at");
  CREATE INDEX "scenes_created_at_idx" ON "scenes" USING btree ("created_at");
  CREATE INDEX "scenes__status_idx" ON "scenes" USING btree ("_status");
  CREATE INDEX "scenes_rels_order_idx" ON "scenes_rels" USING btree ("order");
  CREATE INDEX "scenes_rels_parent_idx" ON "scenes_rels" USING btree ("parent_id");
  CREATE INDEX "scenes_rels_path_idx" ON "scenes_rels" USING btree ("path");
  CREATE INDEX "scenes_rels_events_id_idx" ON "scenes_rels" USING btree ("events_id");
  CREATE INDEX "scenes_rels_evidence_claims_id_idx" ON "scenes_rels" USING btree ("evidence_claims_id");
  CREATE INDEX "scenes_rels_people_id_idx" ON "scenes_rels" USING btree ("people_id");
  CREATE INDEX "scenes_rels_places_id_idx" ON "scenes_rels" USING btree ("places_id");
  CREATE INDEX "scenes_rels_artifacts_id_idx" ON "scenes_rels" USING btree ("artifacts_id");
  CREATE INDEX "scenes_rels_themes_id_idx" ON "scenes_rels" USING btree ("themes_id");
  CREATE INDEX "scenes_rels_media_assets_id_idx" ON "scenes_rels" USING btree ("media_assets_id");
  CREATE INDEX "_scenes_v_parent_idx" ON "_scenes_v" USING btree ("parent_id");
  CREATE INDEX "_scenes_v_version_version_act_idx" ON "_scenes_v" USING btree ("version_act_id");
  CREATE INDEX "_scenes_v_version_version_slug_idx" ON "_scenes_v" USING btree ("version_slug");
  CREATE INDEX "_scenes_v_version_version_primary_event_idx" ON "_scenes_v" USING btree ("version_primary_event_id");
  CREATE INDEX "_scenes_v_version_version_hero_media_idx" ON "_scenes_v" USING btree ("version_hero_media_id");
  CREATE INDEX "_scenes_v_version_seo_version_seo_share_media_idx" ON "_scenes_v" USING btree ("version_seo_share_media_id");
  CREATE INDEX "_scenes_v_version_version_updated_at_idx" ON "_scenes_v" USING btree ("version_updated_at");
  CREATE INDEX "_scenes_v_version_version_created_at_idx" ON "_scenes_v" USING btree ("version_created_at");
  CREATE INDEX "_scenes_v_version_version__status_idx" ON "_scenes_v" USING btree ("version__status");
  CREATE INDEX "_scenes_v_created_at_idx" ON "_scenes_v" USING btree ("created_at");
  CREATE INDEX "_scenes_v_updated_at_idx" ON "_scenes_v" USING btree ("updated_at");
  CREATE INDEX "_scenes_v_snapshot_idx" ON "_scenes_v" USING btree ("snapshot");
  CREATE INDEX "_scenes_v_published_locale_idx" ON "_scenes_v" USING btree ("published_locale");
  CREATE INDEX "_scenes_v_latest_idx" ON "_scenes_v" USING btree ("latest");
  CREATE INDEX "_scenes_v_rels_order_idx" ON "_scenes_v_rels" USING btree ("order");
  CREATE INDEX "_scenes_v_rels_parent_idx" ON "_scenes_v_rels" USING btree ("parent_id");
  CREATE INDEX "_scenes_v_rels_path_idx" ON "_scenes_v_rels" USING btree ("path");
  CREATE INDEX "_scenes_v_rels_events_id_idx" ON "_scenes_v_rels" USING btree ("events_id");
  CREATE INDEX "_scenes_v_rels_evidence_claims_id_idx" ON "_scenes_v_rels" USING btree ("evidence_claims_id");
  CREATE INDEX "_scenes_v_rels_people_id_idx" ON "_scenes_v_rels" USING btree ("people_id");
  CREATE INDEX "_scenes_v_rels_places_id_idx" ON "_scenes_v_rels" USING btree ("places_id");
  CREATE INDEX "_scenes_v_rels_artifacts_id_idx" ON "_scenes_v_rels" USING btree ("artifacts_id");
  CREATE INDEX "_scenes_v_rels_themes_id_idx" ON "_scenes_v_rels" USING btree ("themes_id");
  CREATE INDEX "_scenes_v_rels_media_assets_id_idx" ON "_scenes_v_rels" USING btree ("media_assets_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_rights_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("rights_documents_id");
  CREATE INDEX "payload_locked_documents_rels_media_masters_id_idx" ON "payload_locked_documents_rels" USING btree ("media_masters_id");
  CREATE INDEX "payload_locked_documents_rels_media_assets_id_idx" ON "payload_locked_documents_rels" USING btree ("media_assets_id");
  CREATE INDEX "payload_locked_documents_rels_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("sources_id");
  CREATE INDEX "payload_locked_documents_rels_people_id_idx" ON "payload_locked_documents_rels" USING btree ("people_id");
  CREATE INDEX "payload_locked_documents_rels_places_id_idx" ON "payload_locked_documents_rels" USING btree ("places_id");
  CREATE INDEX "payload_locked_documents_rels_artifacts_id_idx" ON "payload_locked_documents_rels" USING btree ("artifacts_id");
  CREATE INDEX "payload_locked_documents_rels_themes_id_idx" ON "payload_locked_documents_rels" USING btree ("themes_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_evidence_claims_id_idx" ON "payload_locked_documents_rels" USING btree ("evidence_claims_id");
  CREATE INDEX "payload_locked_documents_rels_evidence_links_id_idx" ON "payload_locked_documents_rels" USING btree ("evidence_links_id");
  CREATE INDEX "payload_locked_documents_rels_journey_acts_id_idx" ON "payload_locked_documents_rels" USING btree ("journey_acts_id");
  CREATE INDEX "payload_locked_documents_rels_scenes_id_idx" ON "payload_locked_documents_rels" USING btree ("scenes_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "rights_documents" CASCADE;
  DROP TABLE "media_masters" CASCADE;
  DROP TABLE "media_assets" CASCADE;
  DROP TABLE "_media_assets_v" CASCADE;
  DROP TABLE "sources" CASCADE;
  DROP TABLE "sources_texts" CASCADE;
  DROP TABLE "_sources_v" CASCADE;
  DROP TABLE "_sources_v_texts" CASCADE;
  DROP TABLE "people" CASCADE;
  DROP TABLE "people_texts" CASCADE;
  DROP TABLE "_people_v" CASCADE;
  DROP TABLE "_people_v_texts" CASCADE;
  DROP TABLE "places" CASCADE;
  DROP TABLE "places_texts" CASCADE;
  DROP TABLE "_places_v" CASCADE;
  DROP TABLE "_places_v_texts" CASCADE;
  DROP TABLE "artifacts" CASCADE;
  DROP TABLE "artifacts_texts" CASCADE;
  DROP TABLE "artifacts_rels" CASCADE;
  DROP TABLE "_artifacts_v" CASCADE;
  DROP TABLE "_artifacts_v_texts" CASCADE;
  DROP TABLE "_artifacts_v_rels" CASCADE;
  DROP TABLE "themes" CASCADE;
  DROP TABLE "_themes_v" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_texts" CASCADE;
  DROP TABLE "events_rels" CASCADE;
  DROP TABLE "_events_v" CASCADE;
  DROP TABLE "_events_v_texts" CASCADE;
  DROP TABLE "_events_v_rels" CASCADE;
  DROP TABLE "evidence_claims" CASCADE;
  DROP TABLE "evidence_claims_rels" CASCADE;
  DROP TABLE "_evidence_claims_v" CASCADE;
  DROP TABLE "_evidence_claims_v_rels" CASCADE;
  DROP TABLE "evidence_links" CASCADE;
  DROP TABLE "_evidence_links_v" CASCADE;
  DROP TABLE "journey_acts" CASCADE;
  DROP TABLE "_journey_acts_v" CASCADE;
  DROP TABLE "scenes" CASCADE;
  DROP TABLE "scenes_rels" CASCADE;
  DROP TABLE "_scenes_v" CASCADE;
  DROP TABLE "_scenes_v_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_rights_documents_rights_type";
  DROP TYPE "public"."enum_media_assets_visual_evidence_class";
  DROP TYPE "public"."enum_media_assets_rights_class";
  DROP TYPE "public"."enum_media_assets_asset_status";
  DROP TYPE "public"."enum_media_assets_status";
  DROP TYPE "public"."enum__media_assets_v_version_visual_evidence_class";
  DROP TYPE "public"."enum__media_assets_v_version_rights_class";
  DROP TYPE "public"."enum__media_assets_v_version_asset_status";
  DROP TYPE "public"."enum__media_assets_v_version_status";
  DROP TYPE "public"."enum__media_assets_v_published_locale";
  DROP TYPE "public"."enum_sources_source_type";
  DROP TYPE "public"."enum_sources_reliability_tier";
  DROP TYPE "public"."enum_sources_link_status";
  DROP TYPE "public"."enum_sources_status";
  DROP TYPE "public"."enum__sources_v_version_source_type";
  DROP TYPE "public"."enum__sources_v_version_reliability_tier";
  DROP TYPE "public"."enum__sources_v_version_link_status";
  DROP TYPE "public"."enum__sources_v_version_status";
  DROP TYPE "public"."enum__sources_v_published_locale";
  DROP TYPE "public"."enum_people_birth_chronology_precision";
  DROP TYPE "public"."enum_people_death_chronology_precision";
  DROP TYPE "public"."enum_people_representation_policy";
  DROP TYPE "public"."enum_people_status";
  DROP TYPE "public"."enum__people_v_version_birth_chronology_precision";
  DROP TYPE "public"."enum__people_v_version_death_chronology_precision";
  DROP TYPE "public"."enum__people_v_version_representation_policy";
  DROP TYPE "public"."enum__people_v_version_status";
  DROP TYPE "public"."enum__people_v_published_locale";
  DROP TYPE "public"."enum_places_place_type";
  DROP TYPE "public"."enum_places_historical_location_certainty";
  DROP TYPE "public"."enum_places_status";
  DROP TYPE "public"."enum__places_v_version_place_type";
  DROP TYPE "public"."enum__places_v_version_historical_location_certainty";
  DROP TYPE "public"."enum__places_v_version_status";
  DROP TYPE "public"."enum__places_v_published_locale";
  DROP TYPE "public"."enum_artifacts_artifact_type";
  DROP TYPE "public"."enum_artifacts_chronology_precision";
  DROP TYPE "public"."enum_artifacts_status";
  DROP TYPE "public"."enum__artifacts_v_version_artifact_type";
  DROP TYPE "public"."enum__artifacts_v_version_chronology_precision";
  DROP TYPE "public"."enum__artifacts_v_version_status";
  DROP TYPE "public"."enum__artifacts_v_published_locale";
  DROP TYPE "public"."enum_themes_status";
  DROP TYPE "public"."enum__themes_v_version_status";
  DROP TYPE "public"."enum__themes_v_published_locale";
  DROP TYPE "public"."enum_events_chronology_precision";
  DROP TYPE "public"."enum_events_review_status";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum__events_v_version_chronology_precision";
  DROP TYPE "public"."enum__events_v_version_review_status";
  DROP TYPE "public"."enum__events_v_version_status";
  DROP TYPE "public"."enum__events_v_published_locale";
  DROP TYPE "public"."enum_evidence_claims_evidence_class";
  DROP TYPE "public"."enum_evidence_claims_confidence";
  DROP TYPE "public"."enum_evidence_claims_status";
  DROP TYPE "public"."enum__evidence_claims_v_version_evidence_class";
  DROP TYPE "public"."enum__evidence_claims_v_version_confidence";
  DROP TYPE "public"."enum__evidence_claims_v_version_status";
  DROP TYPE "public"."enum__evidence_claims_v_published_locale";
  DROP TYPE "public"."enum_evidence_links_role";
  DROP TYPE "public"."enum_evidence_links_strength";
  DROP TYPE "public"."enum_evidence_links_status";
  DROP TYPE "public"."enum__evidence_links_v_version_role";
  DROP TYPE "public"."enum__evidence_links_v_version_strength";
  DROP TYPE "public"."enum__evidence_links_v_version_status";
  DROP TYPE "public"."enum__evidence_links_v_published_locale";
  DROP TYPE "public"."enum_journey_acts_visual_era_key";
  DROP TYPE "public"."enum_journey_acts_status";
  DROP TYPE "public"."enum__journey_acts_v_version_visual_era_key";
  DROP TYPE "public"."enum__journey_acts_v_version_status";
  DROP TYPE "public"."enum__journey_acts_v_published_locale";
  DROP TYPE "public"."enum_scenes_evidence_badge_mode";
  DROP TYPE "public"."enum_scenes_choreography_key";
  DROP TYPE "public"."enum_scenes_scene_type";
  DROP TYPE "public"."enum_scenes_status";
  DROP TYPE "public"."enum__scenes_v_version_evidence_badge_mode";
  DROP TYPE "public"."enum__scenes_v_version_choreography_key";
  DROP TYPE "public"."enum__scenes_v_version_scene_type";
  DROP TYPE "public"."enum__scenes_v_version_status";
  DROP TYPE "public"."enum__scenes_v_published_locale";`);
}
