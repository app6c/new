import { pgTable, text, serial, integer, boolean, jsonb, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base user schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ 
    id: true
  })
  .extend({
    password: z.string().min(3, "A senha deve ter pelo menos 3 caracteres"),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Analysis application specific schemas
export const analysisRequests = pgTable("analysis_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  requestId: uuid("request_id").defaultRandom().notNull().unique(),
  analysisFor: text("analysis_for").notNull(), // 'myself' or 'other'
  otherReason: text("other_reason"),
  hadSurgery: boolean("had_surgery").notNull(),
  surgeryDetails: text("surgery_details"),
  hadTrauma: boolean("had_trauma").notNull(),
  traumaDetails: text("trauma_details"),
  usedDevice: boolean("used_device").notNull(),
  deviceDetails: text("device_details"),
  priorityArea: text("priority_area").notNull(), // 'health', 'relationships', 'professional'
  complaint1: text("complaint_1").notNull(),
  complaint2: text("complaint_2"),
  complaint3: text("complaint_3"),
  frontBodyPhoto: text("front_body_photo").notNull(),
  backBodyPhoto: text("back_body_photo").notNull(),
  seriousFacePhoto: text("serious_face_photo").notNull(),
  smilingFacePhoto: text("smiling_face_photo").notNull(),
  // Status ampliado para acompanhar o progresso da análise
  status: text("status", {
    enum: ['aguardando_pagamento', 'aguardando_analise', 'em_analise', 'concluido', 'cancelado']
  }).notNull().default('aguardando_pagamento'),
  paymentIntentId: text("payment_intent_id"),
  amount: integer("amount").notNull().default(9700), // in cents, so $97.00
  hasResult: boolean("has_result").default(false), // Indica se a análise tem um resultado disponível para visualização
  // Campo analystId removido pois não existe na tabela física
  // Campo lastUpdateAt removido pois não existe na tabela física
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const analysisRequestSchema = createInsertSchema(analysisRequests)
  .omit({ 
    id: true, 
    requestId: true, 
    paymentIntentId: true, 
    status: true, 
    hasResult: true,
    createdAt: true
  })
  .extend({
    userId: z.number(),
    analysisFor: z.enum(['myself', 'other']),
    priorityArea: z.enum(['health', 'relationships', 'professional']),
    hadSurgery: z.boolean(),
    hadTrauma: z.boolean(),
    usedDevice: z.boolean(),
    // Campos opcionais
    otherReason: z.string().optional(),
    surgeryDetails: z.string().optional(),
    traumaDetails: z.string().optional(),
    deviceDetails: z.string().optional(),
    complaint2: z.string().optional(),
    complaint3: z.string().optional(),
    // Fotos opcionais para teste
    frontBodyPhoto: z.string().optional(),
    backBodyPhoto: z.string().optional(),
    seriousFacePhoto: z.string().optional(),
    smilingFacePhoto: z.string().optional(),
    complaint1: z.string().min(1, "Pelo menos uma queixa é obrigatória"),
    amount: z.number().optional()
  });

export type AnalysisRequest = typeof analysisRequests.$inferSelect;
export type InsertAnalysisRequest = z.infer<typeof analysisRequestSchema>;

// Photos are uploaded and stored separately with references to the analysis request
export const photoUploads = pgTable("photo_uploads", {
  id: serial("id").primaryKey(),
  analysisRequestId: integer("analysis_request_id").references(() => analysisRequests.id),
  photoType: text("photo_type").notNull(), // 'front_body', 'back_body', 'serious_face', 'smiling_face'
  photoPath: text("photo_path").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const photoUploadSchema = createInsertSchema(photoUploads)
  .omit({ id: true, createdAt: true });

export type PhotoUpload = typeof photoUploads.$inferSelect;
export type InsertPhotoUpload = z.infer<typeof photoUploadSchema>;

// Tabela de pontuação corporal para análise manual (Etapa 6)
export const bodyScoringTable = pgTable("body_scoring_table", {
  id: serial("id").primaryKey(),
  analysisRequestId: integer("analysis_request_id").references(() => analysisRequests.id).notNull().unique(),
  // Pontuações para cada parte do corpo por tipo de padrão
  // CRIATIVO
  creativoHead: integer("criativo_head").notNull().default(0),
  creativoChest: integer("criativo_chest").notNull().default(0),
  creativoShoulder: integer("criativo_shoulder").notNull().default(0),
  creativoBack: integer("criativo_back").notNull().default(0),
  creativoLegs: integer("criativo_legs").notNull().default(0),
  // CONECTIVO
  conectivoHead: integer("conectivo_head").notNull().default(0),
  conectivoChest: integer("conectivo_chest").notNull().default(0),
  conectivoShoulder: integer("conectivo_shoulder").notNull().default(0),
  conectivoBack: integer("conectivo_back").notNull().default(0),
  conectivoLegs: integer("conectivo_legs").notNull().default(0),
  // FORTE
  forteHead: integer("forte_head").notNull().default(0),
  forteChest: integer("forte_chest").notNull().default(0),
  forteShoulder: integer("forte_shoulder").notNull().default(0),
  forteBack: integer("forte_back").notNull().default(0),
  forteLegs: integer("forte_legs").notNull().default(0),
  // LIDER
  liderHead: integer("lider_head").notNull().default(0),
  liderChest: integer("lider_chest").notNull().default(0),
  liderShoulder: integer("lider_shoulder").notNull().default(0),
  liderBack: integer("lider_back").notNull().default(0),
  liderLegs: integer("lider_legs").notNull().default(0),
  // COMPETITIVO
  competitivoHead: integer("competitivo_head").notNull().default(0),
  competitivoChest: integer("competitivo_chest").notNull().default(0),
  competitivoShoulder: integer("competitivo_shoulder").notNull().default(0),
  competitivoBack: integer("competitivo_back").notNull().default(0),
  competitivoLegs: integer("competitivo_legs").notNull().default(0),
  // Totais calculados
  creativoTotal: integer("criativo_total").notNull().default(0),
  conectivoTotal: integer("conectivo_total").notNull().default(0),
  forteTotal: integer("forte_total").notNull().default(0),
  liderTotal: integer("lider_total").notNull().default(0),
  competitivoTotal: integer("competitivo_total").notNull().default(0),
  // Percentuais
  creativoPercentage: integer("criativo_percentage").notNull().default(0),
  conectivoPercentage: integer("conectivo_percentage").notNull().default(0),
  fortePercentage: integer("forte_percentage").notNull().default(0),
  liderPercentage: integer("lider_percentage").notNull().default(0),
  competitivoPercentage: integer("competitivo_percentage").notNull().default(0),
  // Top 3 padrões
  primaryPattern: text("primary_pattern").notNull().default(''),
  secondaryPattern: text("secondary_pattern").notNull().default(''),
  tertiaryPattern: text("tertiary_pattern").notNull().default(''),
  // Metadados
  scoredBy: text("scored_by").notNull().default('analista'),
  scoringNotes: text("scoring_notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const bodyScoringTableSchema = createInsertSchema(bodyScoringTable)
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true, 
    creativoTotal: true, 
    conectivoTotal: true, 
    forteTotal: true, 
    liderTotal: true, 
    competitivoTotal: true, 
    creativoPercentage: true, 
    conectivoPercentage: true, 
    fortePercentage: true, 
    liderPercentage: true, 
    competitivoPercentage: true,
    primaryPattern: true,
    secondaryPattern: true,
    tertiaryPattern: true
  });

export type BodyScoringTable = typeof bodyScoringTable.$inferSelect;
export type InsertBodyScoringTable = z.infer<typeof bodyScoringTableSchema>;

// Analysis results provided by analysts
export const analysisResults = pgTable("analysis_results", {
  id: serial("id").primaryKey(),
  analysisRequestId: integer("analysis_request_id").references(() => analysisRequests.id),
  
  // Bloco 1 - Resposta às Queixas
  diagnosticoEmocional: text("diagnostico_emocional").notNull(),
  explicacaoBloqueio: text("explicacao_bloqueio").notNull(),
  caminhoLiberacao: text("caminho_liberacao").notNull(),
  
  // Bloco 2 - Devolutiva dos Top 3 Traços
  // Informações do Traço Primário
  traco1Nome: text("traco1_nome").notNull(),
  traco1Percentual: integer("traco1_percentual").notNull(),
  traco1Dor: jsonb("traco1_dor").notNull(), // {pessoal, relacionamentos, profissional}
  traco1Recurso: jsonb("traco1_recurso").notNull(), // {pessoal, relacionamentos, profissional}
  
  // Informações do Traço Secundário
  traco2Nome: text("traco2_nome").notNull(),
  traco2Percentual: integer("traco2_percentual").notNull(),
  traco2Dor: jsonb("traco2_dor").notNull(), // {pessoal, relacionamentos, profissional}
  traco2Recurso: jsonb("traco2_recurso").notNull(), // {pessoal, relacionamentos, profissional}
  
  // Informações do Traço Terciário
  traco3Nome: text("traco3_nome").notNull(),
  traco3Percentual: integer("traco3_percentual").notNull(),
  traco3Dor: jsonb("traco3_dor").notNull(), // {pessoal, relacionamentos, profissional}
  traco3Recurso: jsonb("traco3_recurso").notNull(), // {pessoal, relacionamentos, profissional}
  
  // Bloco 3 - Convite à Ação (Virada de Chave)
  acaoTraco1: text("acao_traco1"),
  acaoTraco2: text("acao_traco2"),
  acaoTraco3: text("acao_traco3"),
  
  // Campos originais (mantidos para compatibilidade)
  personalityPattern: text("personality_pattern"),
  analysisReport: text("analysis_report"),
  strategicGuide: text("strategic_guide"),
  personalizedTips: jsonb("personalized_tips"),
  
  // Removemos os campos que não existem no banco de dados:
  // regenerationRequested, regenerationRequestedAt, isRegenerated 
  // pois estamos usando hasResult na tabela analysis_requests para este fim
  
  completedAt: text("completed_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const analysisResultSchema = createInsertSchema(analysisResults)
  .omit({ 
    id: true, 
    completedAt: true,
    updatedAt: true
  });

// Não precisamos mais omitir os campos removidos:
// regenerationRequested, regenerationRequestedAt, isRegenerated

export type AnalysisResult = typeof analysisResults.$inferSelect;
export type InsertAnalysisResult = z.infer<typeof analysisResultSchema>;

// Emotional Patterns (6 layers)
export const emotionalPatterns = pgTable("emotional_patterns", {
  id: serial("id").primaryKey(),
  patternType: varchar("pattern_type", { length: 30 }).notNull(), // CRIATIVO, CONECTIVO, FORTE, LIDER, COMPETITIVO
  areaType: varchar("area_type", { length: 30 }).notNull(), // Pessoal, Relacionamentos, Profissional
  isPain: boolean("is_pain").notNull(), // true = Dor, false = Recurso
  description: text("description").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertEmotionalPatternSchema = createInsertSchema(emotionalPatterns)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type EmotionalPattern = typeof emotionalPatterns.$inferSelect;
export type InsertEmotionalPattern = z.infer<typeof insertEmotionalPatternSchema>;
