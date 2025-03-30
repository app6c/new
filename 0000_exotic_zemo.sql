-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "analysis_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysis_request_id" integer,
	"personality_pattern" text NOT NULL,
	"analysis_report" text NOT NULL,
	"strategic_guide" text NOT NULL,
	"personalized_tips" jsonb NOT NULL,
	"completed_at" text NOT NULL,
	"diagnostico_emocional" text NOT NULL,
	"explicacao_bloqueio" text NOT NULL,
	"caminho_liberacao" text NOT NULL,
	"traco1_nome" text NOT NULL,
	"traco1_percentual" integer NOT NULL,
	"traco1_dor" jsonb NOT NULL,
	"traco1_recurso" jsonb NOT NULL,
	"traco2_nome" text NOT NULL,
	"traco2_percentual" integer NOT NULL,
	"traco2_dor" jsonb NOT NULL,
	"traco2_recurso" jsonb NOT NULL,
	"traco3_nome" text NOT NULL,
	"traco3_percentual" integer NOT NULL,
	"traco3_dor" jsonb NOT NULL,
	"traco3_recurso" jsonb NOT NULL,
	"acao_traco1" text,
	"acao_traco2" text,
	"acao_traco3" text,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emotional_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"pattern_type" varchar(30) NOT NULL,
	"area_type" varchar(30) NOT NULL,
	"is_pain" boolean NOT NULL,
	"description" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "body_scoring_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysis_request_id" integer NOT NULL,
	"criativo_head" integer DEFAULT 0 NOT NULL,
	"criativo_chest" integer DEFAULT 0 NOT NULL,
	"criativo_shoulder" integer DEFAULT 0 NOT NULL,
	"criativo_back" integer DEFAULT 0 NOT NULL,
	"criativo_legs" integer DEFAULT 0 NOT NULL,
	"conectivo_head" integer DEFAULT 0 NOT NULL,
	"conectivo_chest" integer DEFAULT 0 NOT NULL,
	"conectivo_shoulder" integer DEFAULT 0 NOT NULL,
	"conectivo_back" integer DEFAULT 0 NOT NULL,
	"conectivo_legs" integer DEFAULT 0 NOT NULL,
	"forte_head" integer DEFAULT 0 NOT NULL,
	"forte_chest" integer DEFAULT 0 NOT NULL,
	"forte_shoulder" integer DEFAULT 0 NOT NULL,
	"forte_back" integer DEFAULT 0 NOT NULL,
	"forte_legs" integer DEFAULT 0 NOT NULL,
	"lider_head" integer DEFAULT 0 NOT NULL,
	"lider_chest" integer DEFAULT 0 NOT NULL,
	"lider_shoulder" integer DEFAULT 0 NOT NULL,
	"lider_back" integer DEFAULT 0 NOT NULL,
	"lider_legs" integer DEFAULT 0 NOT NULL,
	"competitivo_head" integer DEFAULT 0 NOT NULL,
	"competitivo_chest" integer DEFAULT 0 NOT NULL,
	"competitivo_shoulder" integer DEFAULT 0 NOT NULL,
	"competitivo_back" integer DEFAULT 0 NOT NULL,
	"competitivo_legs" integer DEFAULT 0 NOT NULL,
	"criativo_total" integer DEFAULT 0 NOT NULL,
	"conectivo_total" integer DEFAULT 0 NOT NULL,
	"forte_total" integer DEFAULT 0 NOT NULL,
	"lider_total" integer DEFAULT 0 NOT NULL,
	"competitivo_total" integer DEFAULT 0 NOT NULL,
	"criativo_percentage" integer DEFAULT 0 NOT NULL,
	"conectivo_percentage" integer DEFAULT 0 NOT NULL,
	"forte_percentage" integer DEFAULT 0 NOT NULL,
	"lider_percentage" integer DEFAULT 0 NOT NULL,
	"competitivo_percentage" integer DEFAULT 0 NOT NULL,
	"primary_pattern" text DEFAULT '' NOT NULL,
	"secondary_pattern" text DEFAULT '' NOT NULL,
	"tertiary_pattern" text DEFAULT '' NOT NULL,
	"scored_by" text DEFAULT 'analista' NOT NULL,
	"scoring_notes" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "body_scoring_table_analysis_request_id_unique" UNIQUE("analysis_request_id")
);
--> statement-breakpoint
CREATE TABLE "photo_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysis_request_id" integer,
	"photo_type" text NOT NULL,
	"photo_path" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"request_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"analysis_for" text NOT NULL,
	"other_reason" text,
	"had_surgery" boolean NOT NULL,
	"surgery_details" text,
	"had_trauma" boolean NOT NULL,
	"trauma_details" text,
	"used_device" boolean NOT NULL,
	"device_details" text,
	"priority_area" text NOT NULL,
	"complaint_1" text NOT NULL,
	"complaint_2" text,
	"complaint_3" text,
	"front_body_photo" text NOT NULL,
	"back_body_photo" text NOT NULL,
	"serious_face_photo" text NOT NULL,
	"smiling_face_photo" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_intent_id" text,
	"amount" integer DEFAULT 9700 NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "analysis_requests_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_analysis_request_id_analysis_requests_id_fk" FOREIGN KEY ("analysis_request_id") REFERENCES "public"."analysis_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_scoring_table" ADD CONSTRAINT "body_scoring_table_analysis_request_id_analysis_requests_id_fk" FOREIGN KEY ("analysis_request_id") REFERENCES "public"."analysis_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_uploads" ADD CONSTRAINT "photo_uploads_analysis_request_id_analysis_requests_id_fk" FOREIGN KEY ("analysis_request_id") REFERENCES "public"."analysis_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_requests" ADD CONSTRAINT "analysis_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "session" USING btree ("expire" timestamp_ops);
*/