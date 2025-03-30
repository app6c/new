import {
  users, User, InsertUser,
  analysisRequests, AnalysisRequest, InsertAnalysisRequest,
  photoUploads, PhotoUpload, InsertPhotoUpload,
  bodyScoringTable, BodyScoringTable, InsertBodyScoringTable,
  analysisResults, AnalysisResult, InsertAnalysisResult,
  emotionalPatterns, EmotionalPattern, InsertEmotionalPattern
} from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

// Expanded interface with all CRUD methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateLastLogin(userId: number): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUserStatus(userId: number, status: string): Promise<User | undefined>;

  // Analysis Request methods
  createAnalysisRequest(request: InsertAnalysisRequest): Promise<AnalysisRequest>;
  getAnalysisRequest(id: number): Promise<AnalysisRequest | undefined>;
  getAnalysisRequestByRequestId(requestId: string): Promise<AnalysisRequest | undefined>;
  updateAnalysisRequestStatus(id: number, status: string): Promise<AnalysisRequest | undefined>;
  updateAnalysisRequestPayment(id: number, paymentIntentId: string): Promise<AnalysisRequest | undefined>;
  assignAnalystToRequest(requestId: number, analystId: number): Promise<AnalysisRequest | undefined>;
  markAnalysisRequestHasResult(id: number, hasResult: boolean): Promise<AnalysisRequest | undefined>;
  getAllAnalysisRequests(): Promise<AnalysisRequest[]>;
  getClientAnalysisRequests(userId: number): Promise<AnalysisRequest[]>;
  getAnalystAnalysisRequests(analystId: number): Promise<AnalysisRequest[]>;
  deleteAnalysisRequest(id: number): Promise<boolean>;

  // Photo Upload methods
  createPhotoUpload(photoUpload: InsertPhotoUpload): Promise<PhotoUpload>;
  getPhotoUploads(analysisRequestId: number): Promise<PhotoUpload[]>;

  // Body Scoring Table methods (Etapa 6)
  createBodyScoringTable(scoringData: InsertBodyScoringTable): Promise<BodyScoringTable>;
  getBodyScoringTable(analysisRequestId: number): Promise<BodyScoringTable | undefined>;
  updateBodyScoringTable(id: number, scoringData: Partial<InsertBodyScoringTable>): Promise<BodyScoringTable | undefined>;
  calculateBodyScoringTableTotals(id: number): Promise<BodyScoringTable | undefined>;

  // Analysis Result methods
  createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult>;
  getAnalysisResult(analysisRequestId: number): Promise<AnalysisResult | undefined>;
  updateAnalysisResult(id: number, updateData: Partial<InsertAnalysisResult>): Promise<AnalysisResult | undefined>;

  // Emotional Pattern methods
  createEmotionalPattern(pattern: InsertEmotionalPattern): Promise<EmotionalPattern>;
  getEmotionalPatterns(): Promise<EmotionalPattern[]>;
  getEmotionalPatternsByType(patternType: string): Promise<EmotionalPattern[]>;
  getEmotionalPatternsByArea(areaType: string): Promise<EmotionalPattern[]>;
  getEmotionalPatternsByIsPain(isPain: boolean): Promise<EmotionalPattern[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private analysisRequests: Map<number, AnalysisRequest>;
  private photoUploads: Map<number, PhotoUpload>;
  private bodyScoringTables: Map<number, BodyScoringTable>;
  private analysisResults: Map<number, AnalysisResult>;
  private requestIdToId: Map<string, number>;
  private currentUserId: number;
  private currentAnalysisRequestId: number;
  private currentPhotoUploadId: number;
  private currentBodyScoringTableId: number;
  private currentAnalysisResultId: number;
  private emotionalPatterns: Map<number, EmotionalPattern>;
  private currentEmotionalPatternId: number;

  constructor() {
    this.users = new Map();
    this.analysisRequests = new Map();
    this.photoUploads = new Map();
    this.bodyScoringTables = new Map();
    this.analysisResults = new Map();
    this.requestIdToId = new Map();
    this.emotionalPatterns = new Map();
    this.currentUserId = 1;
    this.currentAnalysisRequestId = 1;
    this.currentPhotoUploadId = 1;
    this.currentBodyScoringTableId = 1;
    this.currentAnalysisResultId = 1;
    this.currentEmotionalPatternId = 1;

    // Adicionar usuários iniciais
    this.createUser({
      name: "Analista",
      email: "analista@teste.com",
      username: "analista",
      password: "analista",
      role: "admin",
      acceptedTerms: true,
      status: "active"
    });

    this.createUser({
      name: "Cliente Teste",
      email: "cliente@teste.com",
      username: "teste",
      password: "teste",
      role: "client",
      acceptedTerms: true,
      status: "active"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || "client",
      status: insertUser.status || "active",
      createdAt: new Date().toISOString(),
      lastLogin: null,
      resetToken: null,
      resetTokenExpiry: null
    };
    this.users.set(id, user);
    return user;
  }

  async updateLastLogin(userId: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updatedUser = { 
      ...user, 
      lastLogin: new Date().toISOString()
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === role
    );
  }

  async updateUserStatus(userId: number, status: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updatedUser = { 
      ...user, 
      status: status as "active" | "inactive" | "suspended"
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Analysis Request methods
  async createAnalysisRequest(request: InsertAnalysisRequest): Promise<AnalysisRequest> {
    const id = this.currentAnalysisRequestId++;
    const requestId = uuidv4();

    // Garantir valores corretos para todos os campos
    const analysisRequest: AnalysisRequest = {
      id,
      requestId,
      userId: request.userId || 0,
      analysisFor: request.analysisFor,
      otherReason: request.otherReason || null,
      hadSurgery: request.hadSurgery,
      surgeryDetails: request.surgeryDetails || null,
      hadTrauma: request.hadTrauma,
      traumaDetails: request.traumaDetails || null,
      usedDevice: request.usedDevice,
      deviceDetails: request.deviceDetails || null,
      priorityArea: request.priorityArea,
      complaint1: request.complaint1,
      complaint2: request.complaint2 || null,
      complaint3: request.complaint3 || null,
      frontBodyPhoto: request.frontBodyPhoto || '',
      backBodyPhoto: request.backBodyPhoto || '',
      seriousFacePhoto: request.seriousFacePhoto || '',
      smilingFacePhoto: request.smilingFacePhoto || '',
      status: 'aguardando_pagamento' as "aguardando_pagamento" | "aguardando_analise" | "em_analise" | "concluido" | "cancelado",
      paymentIntentId: null,
      amount: request.amount || 9700,
      lastUpdateAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.analysisRequests.set(id, analysisRequest);
    this.requestIdToId.set(requestId, id);
    return analysisRequest;
  }

  async getAnalysisRequest(id: number): Promise<AnalysisRequest | undefined> {
    return this.analysisRequests.get(id);
  }

  async getAnalysisRequestByRequestId(requestId: string): Promise<AnalysisRequest | undefined> {
    const id = this.requestIdToId.get(requestId);
    if (!id) return undefined;
    return this.analysisRequests.get(id);
  }

  async updateAnalysisRequestStatus(id: number, status: string): Promise<AnalysisRequest | undefined> {
    const request = this.analysisRequests.get(id);
    if (!request) return undefined;

    const updatedRequest = { 
      ...request, 
      status: status as "aguardando_pagamento" | "aguardando_analise" | "em_analise" | "concluido" | "cancelado",
      lastUpdateAt: new Date().toISOString()
    };
    this.analysisRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async updateAnalysisRequestPayment(id: number, paymentIntentId: string): Promise<AnalysisRequest | undefined> {
    const request = this.analysisRequests.get(id);
    if (!request) return undefined;

    const updatedRequest = { 
      ...request, 
      paymentIntentId, 
      status: 'aguardando_analise' as "aguardando_pagamento" | "aguardando_analise" | "em_analise" | "concluido" | "cancelado",
      lastUpdateAt: new Date().toISOString()
    };
    this.analysisRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async assignAnalystToRequest(requestId: number, analystId: number): Promise<AnalysisRequest | undefined> {
    const request = this.analysisRequests.get(requestId);
    if (!request) return undefined;

    const updatedRequest = { 
      ...request, 
      // Removida referência a analystId
      status: 'em_analise' as "aguardando_pagamento" | "aguardando_analise" | "em_analise" | "concluido" | "cancelado",
      lastUpdateAt: new Date().toISOString()
    };
    this.analysisRequests.set(requestId, updatedRequest);
    return updatedRequest;
  }

  async markAnalysisRequestHasResult(id: number, hasResult: boolean): Promise<AnalysisRequest | undefined> {
    const request = this.analysisRequests.get(id);
    if (!request) return undefined;

    const updatedRequest = { 
      ...request, 
      hasResult: hasResult,
      lastUpdateAt: new Date().toISOString()
    };

    this.analysisRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async getAllAnalysisRequests(): Promise<AnalysisRequest[]> {
    return Array.from(this.analysisRequests.values());
  }

  async getClientAnalysisRequests(userId: number): Promise<AnalysisRequest[]> {
    return Array.from(this.analysisRequests.values()).filter(
      (request) => request.userId === userId
    );
  }

  async getAnalystAnalysisRequests(analystId: number): Promise<AnalysisRequest[]> {
    // Como não temos analystId, retornamos todos os pedidos que estão 'em_analise' ou 'concluido'
    return Array.from(this.analysisRequests.values()).filter(
      (request) => request.status === 'em_analise' || request.status === 'concluido'
    );
  }

  async deleteAnalysisRequest(id: number): Promise<boolean> {
    // Verificar se a análise existe
    const analysisRequest = this.analysisRequests.get(id);
    if (!analysisRequest) return false;

    // Excluir fotos relacionadas
    const photoUploads = Array.from(this.photoUploads.values())
      .filter(upload => upload.analysisRequestId === id);

    for (const photo of photoUploads) {
      this.photoUploads.delete(photo.id);
    }

    // Excluir tabela de pontuação corporal relacionada
    const bodyScoringTable = Array.from(this.bodyScoringTables.values())
      .find(table => table.analysisRequestId === id);

    if (bodyScoringTable) {
      this.bodyScoringTables.delete(bodyScoringTable.id);
    }

    // Excluir resultado de análise relacionado
    const analysisResult = Array.from(this.analysisResults.values())
      .find(result => result.analysisRequestId === id);

    if (analysisResult) {
      this.analysisResults.delete(analysisResult.id);
    }

    // Excluir referência ao requestId
    this.requestIdToId.delete(analysisRequest.requestId);

    // Definir status como "cancelado" (soft delete com prazo de 30 dias para exclusão definitiva)
    analysisRequest.status = "cancelado";
    // Adicionar timestamp para acompanhar quando foi solicitada a exclusão
    analysisRequest.lastUpdateAt = new Date().toISOString();

    // Excluir a própria solicitação de análise após 30 dias (implementação futura)
    // Por enquanto, mantemos com status cancelado
    this.analysisRequests.set(id, analysisRequest);

    return true;
  }

  // Photo Upload methods
  async createPhotoUpload(photoUpload: InsertPhotoUpload): Promise<PhotoUpload> {
    const id = this.currentPhotoUploadId++;
    const upload: PhotoUpload = {
      id,
      analysisRequestId: photoUpload.analysisRequestId || null,
      photoType: photoUpload.photoType,
      photoPath: photoUpload.photoPath,
      createdAt: new Date().toISOString(),
    };

    this.photoUploads.set(id, upload);
    return upload;
  }

  async getPhotoUploads(analysisRequestId: number): Promise<PhotoUpload[]> {
    return Array.from(this.photoUploads.values()).filter(
      (upload) => upload.analysisRequestId === analysisRequestId,
    );
  }

  // Analysis Result methods
  async createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult> {
    const id = this.currentAnalysisResultId++;
    const analysisResult: AnalysisResult = {
      id,
      analysisRequestId: result.analysisRequestId || null,
      diagnosticoEmocional: result.diagnosticoEmocional,
      explicacaoBloqueio: result.explicacaoBloqueio,
      caminhoLiberacao: result.caminhoLiberacao,

      traco1Nome: result.traco1Nome,
      traco1Percentual: result.traco1Percentual,
      traco1Dor: result.traco1Dor,
      traco1Recurso: result.traco1Recurso,

      traco2Nome: result.traco2Nome,
      traco2Percentual: result.traco2Percentual,
      traco2Dor: result.traco2Dor,
      traco2Recurso: result.traco2Recurso,

      traco3Nome: result.traco3Nome,
      traco3Percentual: result.traco3Percentual,
      traco3Dor: result.traco3Dor,
      traco3Recurso: result.traco3Recurso,

      acaoTraco1: result.acaoTraco1 || null,
      acaoTraco2: result.acaoTraco2 || null,
      acaoTraco3: result.acaoTraco3 || null,

      personalityPattern: result.personalityPattern || null,
      analysisReport: result.analysisReport || null,
      strategicGuide: result.strategicGuide || null,
      personalizedTips: result.personalizedTips || null,

      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.analysisResults.set(id, analysisResult);
    return analysisResult;
  }

  async getAnalysisResult(analysisRequestId: number): Promise<AnalysisResult | undefined> {
    return Array.from(this.analysisResults.values()).find(
      (result) => result.analysisRequestId === analysisRequestId,
    );
  }

  async updateAnalysisResult(id: number, updateData: Partial<InsertAnalysisResult>): Promise<AnalysisResult | undefined> {
    const result = this.analysisResults.get(id);
    if (!result) return undefined;

    const updatedResult: AnalysisResult = {
      ...result,
      ...(updateData as Partial<AnalysisResult>),
      updatedAt: new Date().toISOString(),
    };

    this.analysisResults.set(id, updatedResult);
    return updatedResult;
  }

  // Body Scoring Table methods (Etapa 6)
  async createBodyScoringTable(scoringData: InsertBodyScoringTable): Promise<BodyScoringTable> {
    const id = this.currentBodyScoringTableId++;

    // Garantir que existe pelo menos o ID da solicitação de análise
    if (!scoringData.analysisRequestId) {
      throw new Error("analysisRequestId is required");
    }

    // Cria a tabela de pontuação com valores iniciais
    const bodyScoringData: BodyScoringTable = {
      ...scoringData,
      id,
      // Inicializa valores calculados
      creativoTotal: 0,
      conectivoTotal: 0,
      forteTotal: 0,
      liderTotal: 0,
      competitivoTotal: 0,
      creativoPercentage: 0,
      conectivoPercentage: 0,
      fortePercentage: 0,
      liderPercentage: 0,
      competitivoPercentage: 0,
      primaryPattern: '',
      secondaryPattern: '',
      tertiaryPattern: '',
      // Define os valores padrão
      creativoHead: scoringData.creativoHead || 0,
      creativoChest: scoringData.creativoChest || 0,
      creativoShoulder: scoringData.creativoShoulder || 0,
      creativoBack: scoringData.creativoBack || 0,
      creativoLegs: scoringData.creativoLegs || 0,
      conectivoHead: scoringData.conectivoHead || 0,
      conectivoChest: scoringData.conectivoChest || 0,
      conectivoShoulder: scoringData.conectivoShoulder || 0,
      conectivoBack: scoringData.conectivoBack || 0,
      conectivoLegs: scoringData.conectivoLegs || 0,
      forteHead: scoringData.forteHead || 0,
      forteChest: scoringData.forteChest || 0,
      forteShoulder: scoringData.forteShoulder || 0,
      forteBack: scoringData.forteBack || 0,
      forteLegs: scoringData.forteLegs || 0,
      liderHead: scoringData.liderHead || 0,
      liderChest: scoringData.liderChest || 0,
      liderShoulder: scoringData.liderShoulder || 0,
      liderBack: scoringData.liderBack || 0,
      liderLegs: scoringData.liderLegs || 0,
      competitivoHead: scoringData.competitivoHead || 0,
      competitivoChest: scoringData.competitivoChest || 0,
      competitivoShoulder: scoringData.competitivoShoulder || 0,
      competitivoBack: scoringData.competitivoBack || 0,
      competitivoLegs: scoringData.competitivoLegs || 0,
      // Metadados
      scoredBy: scoringData.scoredBy || 'analista',
      scoringNotes: scoringData.scoringNotes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Calcular os totais e percentuais
    const calculatedData = this.calculateTotals(bodyScoringData);

    this.bodyScoringTables.set(id, calculatedData);
    return calculatedData;
  }

  async getBodyScoringTable(analysisRequestId: number): Promise<BodyScoringTable | undefined> {
    return Array.from(this.bodyScoringTables.values()).find(
      (table) => table.analysisRequestId === analysisRequestId,
    );
  }

  async updateBodyScoringTable(id: number, scoringData: Partial<InsertBodyScoringTable>): Promise<BodyScoringTable | undefined> {
    const table = this.bodyScoringTables.get(id);
    if (!table) return undefined;

    // Atualiza os campos
    const updatedTable: BodyScoringTable = {
      ...table,
      ...(scoringData as Partial<BodyScoringTable>),
      updatedAt: new Date().toISOString(),
    };

    // Recalcular os totais e percentuais
    const calculatedTable = this.calculateTotals(updatedTable);

    this.bodyScoringTables.set(id, calculatedTable);
    return calculatedTable;
  }

  async calculateBodyScoringTableTotals(id: number): Promise<BodyScoringTable | undefined> {
    const table = this.bodyScoringTables.get(id);
    if (!table) return undefined;

    const calculatedTable = this.calculateTotals(table);
    this.bodyScoringTables.set(id, calculatedTable);
    return calculatedTable;
  }

  // Método auxiliar para calcular totais e percentuais
  private calculateTotals(table: BodyScoringTable): BodyScoringTable {
    // Calcular totais por padrão
    const creativoTotal = table.creativoHead + table.creativoChest + 
                         table.creativoShoulder + table.creativoBack + table.creativoLegs;

    const conectivoTotal = table.conectivoHead + table.conectivoChest + 
                          table.conectivoShoulder + table.conectivoBack + table.conectivoLegs;

    const forteTotal = table.forteHead + table.forteChest + 
                       table.forteShoulder + table.forteBack + table.forteLegs;

    const liderTotal = table.liderHead + table.liderChest + 
                       table.liderShoulder + table.liderBack + table.liderLegs;

    const competitivoTotal = table.competitivoHead + table.competitivoChest + 
                            table.competitivoShoulder + table.competitivoBack + table.competitivoLegs;

    // Calcular o total geral
    const totalPoints = creativoTotal + conectivoTotal + forteTotal + liderTotal + competitivoTotal;

    // Calcular percentuais (se o total for zero, todos os percentuais serão zero)
    const creativoPercentage = totalPoints > 0 ? Math.round((creativoTotal / totalPoints) * 100) : 0;
    const conectivoPercentage = totalPoints > 0 ? Math.round((conectivoTotal / totalPoints) * 100) : 0;
    const fortePercentage = totalPoints > 0 ? Math.round((forteTotal / totalPoints) * 100) : 0;
    const liderPercentage = totalPoints > 0 ? Math.round((liderTotal / totalPoints) * 100) : 0;
    const competitivoPercentage = totalPoints > 0 ? Math.round((competitivoTotal / totalPoints) * 100) : 0;

    // Criar array para ordenar padrões
    const patterns = [
      { type: 'CRIATIVO', percentage: creativoPercentage },
      { type: 'CONECTIVO', percentage: conectivoPercentage },
      { type: 'FORTE', percentage: fortePercentage },
      { type: 'LIDER', percentage: liderPercentage },
      { type: 'COMPETITIVO', percentage: competitivoPercentage }
    ];

    // Ordenar por percentual (ordem decrescente)
    patterns.sort((a, b) => b.percentage - a.percentage);

    // Determinar os 3 padrões principais
    const primaryPattern = patterns[0]?.percentage > 0 ? patterns[0].type : '';
    const secondaryPattern = patterns[1]?.percentage > 0 ? patterns[1].type : '';
    const tertiaryPattern = patterns[2]?.percentage > 0 ? patterns[2].type : '';

    // Atualizar a tabela com os valores calculados
    return {
      ...table,
      creativoTotal,
      conectivoTotal,
      forteTotal,
      liderTotal,
      competitivoTotal,
      creativoPercentage,
      conectivoPercentage,
      fortePercentage,
      liderPercentage,
      competitivoPercentage,
      primaryPattern,
      secondaryPattern,
      tertiaryPattern,
      updatedAt: new Date().toISOString()
    };
  }

  // Emotional Pattern methods
  async createEmotionalPattern(pattern: InsertEmotionalPattern): Promise<EmotionalPattern> {
    const id = this.currentEmotionalPatternId++;
    const emotionalPattern: EmotionalPattern = {
      ...pattern,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.emotionalPatterns.set(id, emotionalPattern);
    return emotionalPattern;
  }

  async getEmotionalPatterns(): Promise<EmotionalPattern[]> {
    return Array.from(this.emotionalPatterns.values());
  }

  async getEmotionalPatternsByType(patternType: string): Promise<EmotionalPattern[]> {
    return Array.from(this.emotionalPatterns.values()).filter(
      (pattern) => pattern.patternType.toLowerCase() === patternType.toLowerCase()
    );
  }

  async getEmotionalPatternsByArea(areaType: string): Promise<EmotionalPattern[]> {
    return Array.from(this.emotionalPatterns.values()).filter(
      (pattern) => pattern.areaType.toLowerCase() === areaType.toLowerCase()
    );
  }

  async getEmotionalPatternsByIsPain(isPain: boolean): Promise<EmotionalPattern[]> {
    return Array.from(this.emotionalPatterns.values()).filter(
      (pattern) => pattern.isPain === isPain
    );
  }

  async deleteAnalysisRequest(id: number): Promise<boolean> {
    // Verificar se a análise existe
    const analysisRequest = this.analysisRequests.get(id);
    if (!analysisRequest) return false;

    // Excluir fotos relacionadas
    const photoUploads = Array.from(this.photoUploads.values())
      .filter(upload => upload.analysisRequestId === id);

    for (const photo of photoUploads) {
      this.photoUploads.delete(photo.id);
    }

    // Excluir tabela de pontuação corporal relacionada
    const bodyScoringTable = Array.from(this.bodyScoringTables.values())
      .find(table => table.analysisRequestId === id);

    if (bodyScoringTable) {
      this.bodyScoringTables.delete(bodyScoringTable.id);
    }

    // Excluir resultado de análise relacionado
    const analysisResult = Array.from(this.analysisResults.values())
      .find(result => result.analysisRequestId === id);

    if (analysisResult) {
      this.analysisResults.delete(analysisResult.id);
    }

    // Excluir referência ao requestId
    this.requestIdToId.delete(analysisRequest.requestId);

    // Definir status como "cancelado" (soft delete com prazo de 30 dias para exclusão definitiva)
    analysisRequest.status = "cancelado";
    // Adicionar timestamp para acompanhar quando foi solicitada a exclusão
    analysisRequest.lastUpdateAt = new Date().toISOString();

    // Excluir a própria solicitação de análise após 30 dias (implementação futura)
    // Por enquanto, mantemos com status cancelado
    this.analysisRequests.set(id, analysisRequest);

    return true;
  }
}

// Implementação do banco de dados PostgreSQL
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));

    if (!user) return undefined;

    // Adicionar campos adicionais para compatibilidade com o resto do código
    return {
      ...user,
      role: user.username === "analista" ? "admin" : "client",
      name: user.username,
      email: `${user.username}@exemplo.com`,
      acceptedTerms: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      status: "active",
      resetToken: null,
      resetTokenExpiry: null
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) return undefined;

    // Adicionar campos adicionais para compatibilidade com o resto do código
    return {
      ...user,
      role: user.username === "analista" ? "admin" : "client",
      name: user.username,
      email: `${user.username}@exemplo.com`,
      acceptedTerms: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      status: "active",
      resetToken: null,
      resetTokenExpiry: null
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Como não temos a coluna email no DB, retornamos undefined
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Como temos apenas id, username e password no DB, extrair campos necessários
    const userData = {
      username: insertUser.username,
      password: insertUser.password,
      name: insertUser.username // Usar username como nome por padrão
    };

    const [user] = await db.insert(users).values(userData).returning();

    // Simular campos adicionais para compatibilidade com o resto do código
    return {
      ...user,
      role: insertUser.username === "analista" ? "admin" : "client",
      name: insertUser.name || insertUser.username,
      email: insertUser.email || "",
      acceptedTerms: insertUser.acceptedTerms || true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      status: "active",
      resetToken: null,
      resetTokenExpiry: null
    };
  }

  async updateLastLogin(userId: number): Promise<User | undefined> {
    // Como não temos a coluna lastLogin no DB, apenas retornamos o usuário atual
    return this.getUser(userId);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    // Como não temos a coluna role no DB, tratamos todos como o mesmo tipo
    if (role === "admin") {
      // Apenas retornar usuários cujo username seja "analista"
      const allUsers = await db.select().from(users);
      return allUsers.filter(user => user.username === "analista");
    } else {
      // Retornar todos os outros usuários
      const allUsers = await db.select().from(users);
      return allUsers.filter(user => user.username !== "analista");
    }
  }

  async updateUserStatus(userId: number, status: string): Promise<User | undefined> {
    // Como não temos a coluna status no DB, apenas retornamos o usuário atual
    return this.getUser(userId);
  }

  async assignAnalystToRequest(requestId: number, analystId: number): Promise<AnalysisRequest | undefined> {
    // Não temos coluna analystId, só atualizamos o status para em_analise
    const [updatedRequest] = await db.update(analysisRequests)
      .set({ 
        status: "em_analise"
      })
      .where(eq(analysisRequests.id, requestId))
      .returning();
    return updatedRequest;
  }

  async getClientAnalysisRequests(userId: number): Promise<AnalysisRequest[]> {
    return await db.select().from(analysisRequests)
      .where(eq(analysisRequests.userId, userId));
  }

  async getAnalystAnalysisRequests(analystId: number): Promise<AnalysisRequest[]> {
    // Como não temos a coluna analystId, vamos retornar todas as análises em estado "em_analise"
    // ou que tenham sido concluídas (analista admin pode ver todas)
    return await db.select().from(analysisRequests)
      .where(sql`${analysisRequests.status} IN ('em_analise', 'concluido')`);
  }

  // Analysis Request methods
  async createAnalysisRequest(request: InsertAnalysisRequest): Promise<AnalysisRequest> {
    // Garantindo que todos os campos opcionais sejam tratados corretamente
    const data = {
      analysisFor: request.analysisFor,
      otherReason: request.otherReason || null,
      hadSurgery: request.hadSurgery,
      surgeryDetails: request.surgeryDetails || null,
      hadTrauma: request.hadTrauma,
      traumaDetails: request.traumaDetails || null,
      usedDevice: request.usedDevice,
      deviceDetails: request.deviceDetails || null,
      priorityArea: request.priorityArea,
      complaint1: request.complaint1,
      complaint2: request.complaint2 || null,
      complaint3: request.complaint3 || null,
      frontBodyPhoto: request.frontBodyPhoto || '', // Temporariamente permitindo vazio
      backBodyPhoto: request.backBodyPhoto || '', // Temporariamente permitindo vazio
      seriousFacePhoto: request.seriousFacePhoto || '', // Temporariamente permitindo vazio
      smilingFacePhoto: request.smilingFacePhoto || '', // Temporariamente permitindo vazio
      amount: request.amount || 9700
    };

    const [analysisRequest] = await db.insert(analysisRequests).values({
      ...data,
      userId: request.userId,
      requestId: uuidv4(),
      status: 'aguardando_pagamento',
      paymentIntentId: null,
      lastUpdateAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }).returning();

    console.log("Análise criada com sucesso:", analysisRequest);

    return analysisRequest;
  }

  async getAnalysisRequest(id: number): Promise<AnalysisRequest | undefined> {
    const [request] = await db.select().from(analysisRequests).where(eq(analysisRequests.id, id));
    return request;
  }

  async getAnalysisRequestByRequestId(requestId: string): Promise<AnalysisRequest | undefined> {
    const [request] = await db.select().from(analysisRequests).where(eq(analysisRequests.requestId, requestId));
    return request;
  }

  async updateAnalysisRequestStatus(id: number, status: string): Promise<AnalysisRequest | undefined> {
    // Garantir que status seja um valor permitido
    const validStatus = ['pending', 'aguardando_pagamento', 'aguardando_analise', 'em_analise', 'concluido', 'cancelado'];
    if (!validStatus.includes(status)) {
      status = 'pending'; // Default fallback
    }

    const [updatedRequest] = await db.update(analysisRequests)
      .set({ status: status as any }) // Using type assertion para evitar erros de tipo
      .where(eq(analysisRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async updateAnalysisRequestPayment(id: number, paymentIntentId: string): Promise<AnalysisRequest | undefined> {
    const [updatedRequest] = await db.update(analysisRequests)
      .set({ 
        paymentIntentId, 
        status: 'aguardando_analise' as any // Usando "aguardando_analise" em vez de "paid"
      })
      .where(eq(analysisRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async markAnalysisRequestHasResult(id: number, hasResult: boolean): Promise<AnalysisRequest | undefined> {
    const [updatedRequest] = await db.update(analysisRequests)
      .set({ 
        hasResult: hasResult
      })
      .where(eq(analysisRequests.id, id))
      .returning();

    console.log(`Análise ID ${id} marcada com hasResult = ${hasResult}`);
    return updatedRequest;
  }

  async getAllAnalysisRequests(): Promise<AnalysisRequest[]> {
    return await db.select().from(analysisRequests);
  }

  // Photo Upload methods
  async createPhotoUpload(photoUpload: InsertPhotoUpload): Promise<PhotoUpload> {
    const data = {
      analysisRequestId: photoUpload.analysisRequestId || null,
      photoType: photoUpload.photoType,
      photoPath: photoUpload.photoPath,
    };

    const [upload] = await db.insert(photoUploads).values({
      ...data,
      createdAt: new Date().toISOString()
    }).returning();
    return upload;
  }

  async getPhotoUploads(analysisRequestId: number): Promise<PhotoUpload[]> {
    return await db.select().from(photoUploads)
      .where(eq(photoUploads.analysisRequestId, analysisRequestId));
  }

  // Analysis Result methods
  async createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult> {
    // Filtrar campos de regeneração que não existem no banco de dados físico
    const { regenerationRequested, regenerationRequestedAt, isRegenerated, ...validResult } = result as any;

    // Em vez de usar o insert direto com o schema (que inclui campos inexistentes),
    // vamos usar SQL bruto para inserir apenas os campos que sabemos que existem
    const completedAt = new Date().toISOString();
    const updatedAt = new Date().toISOString();

    // Usar SQL preparado para evitar injeção de SQL
    const query = `
      INSERT INTO analysis_results (
        analysis_request_id,
        diagnostico_emocional,
        explicacao_bloqueio,
        caminho_liberacao,
        traco1_nome,
        traco1_percentual,
        traco1_dor,
        traco1_recurso,
        traco2_nome,
        traco2_percentual,
        traco2_dor,
        traco2_recurso,
        traco3_nome,
        traco3_percentual,
        traco3_dor,
        traco3_recurso,
        acao_traco1,
        acao_traco2,
        acao_traco3,
        personality_pattern,
        analysis_report,
        strategic_guide,
        personalized_tips,
        completed_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25
      )
      RETURNING *
    `;

    const values = [
      validResult.analysisRequestId || null,
      validResult.diagnosticoEmocional,
      validResult.explicacaoBloqueio,
      validResult.caminhoLiberacao,
      validResult.traco1Nome,
      validResult.traco1Percentual,
      validResult.traco1Dor,
      validResult.traco1Recurso,
      validResult.traco2Nome,
      validResult.traco2Percentual,
      validResult.traco2Dor,
      validResult.traco2Recurso,
      validResult.traco3Nome,
      validResult.traco3Percentual,
      validResult.traco3Dor,
      validResult.traco3Recurso,
      validResult.acaoTraco1,
      validResult.acaoTraco2,
      validResult.acaoTraco3,
      validResult.personalityPattern,
      validResult.analysisReport,
      validResult.strategicGuide,
      validResult.personalizedTips,
      completedAt,
      updatedAt
    ];

    try {
      // Importar o pool diretamente de db.ts
      const { pool } = await import('./db');
      const result = await pool.query(query, values);

      const analysisResult = result.rows[0];

      // Adicionar campos falsos para compatibilidade
      const resultWithFakeFields = {
        ...analysisResult,
        regenerationRequested: false,
        regenerationRequestedAt: null,
        isRegenerated: false
      } as unknown as AnalysisResult;

      return resultWithFakeFields;
    } catch (error) {
      console.error("Erro ao inserir com SQL bruto:", error);
      throw error;
    }
  }

  async getAnalysisResult(analysisRequestId: number): Promise<AnalysisResult | undefined> {
    // Selecionamos apenas as colunas que sabemos que existem no banco de dados físico
    // e excluímos as colunas de regeneração que estão no schema mas não no banco de dados
    const [result] = await db.select({
      id: analysisResults.id,
      analysisRequestId: analysisResults.analysisRequestId,

      // Bloco 1
      diagnosticoEmocional: analysisResults.diagnosticoEmocional,
      explicacaoBloqueio: analysisResults.explicacaoBloqueio,
      caminhoLiberacao: analysisResults.caminhoLiberacao,

      // Bloco 2 - Traço 1
      traco1Nome: analysisResults.traco1Nome,
      traco1Percentual: analysisResults.traco1Percentual,
      traco1Dor: analysisResults.traco1Dor,
      traco1Recurso: analysisResults.traco1Recurso,

      // Bloco 2 - Traço 2
      traco2Nome: analysisResults.traco2Nome,
      traco2Percentual: analysisResults.traco2Percentual,
      traco2Dor: analysisResults.traco2Dor,
      traco2Recurso: analysisResults.traco2Recurso,

      // Bloco 2 - Traço 3
      traco3Nome: analysisResults.traco3Nome,
      traco3Percentual: analysisResults.traco3Percentual,
      traco3Dor: analysisResults.traco3Dor,
      traco3Recurso: analysisResults.traco3Recurso,

      // Bloco 3
      acaoTraco1: analysisResults.acaoTraco1,
      acaoTraco2: analysisResults.acaoTraco2,
      acaoTraco3: analysisResults.acaoTraco3,

      // Campos originais
      personalityPattern: analysisResults.personalityPattern,
      analysisReport: analysisResults.analysisReport,
      strategicGuide: analysisResults.strategicGuide,
      personalizedTips: analysisResults.personalizedTips,

      // Metadados
      completedAt: analysisResults.completedAt,
      updatedAt: analysisResults.updatedAt
    })
    .from(analysisResults)
    .where(eq(analysisResults.analysisRequestId, analysisRequestId));

    if (result) {
      // Adicionamos propriedades falsas para manter compatibilidade com o código que
      // espera essas propriedades
      return {
        ...result,
        // Mapeamento para os nomes de campo usados no frontend
        // Combinando os três campos no Bloco 1 para criar uma narrativa fluida
        block1Analysis: `${result.diagnosticoEmocional || ''}

${result.explicacaoBloqueio || ''}

${result.caminhoLiberacao || ''}`,
        block2PainPattern: result.traco1Nome,
        block2PainDescription: result.traco1Dor,
        block2ResourcePattern: result.traco2Nome,
        block2ResourceDescription: result.traco2Recurso,
        block2PriorityArea: result.traco3Nome,
        block2PriorityAreaDescription: result.traco3Dor,

        regenerationRequested: false,
        regenerationRequestedAt: null,
        isRegenerated: false
      } as unknown as AnalysisResult;
    }

    return undefined;
  }

  async updateAnalysisResult(id: number, updateData: Partial<InsertAnalysisResult>): Promise<AnalysisResult | undefined> {
    try {
      console.log("Atualizando resultado de análise ID:", id);

      // Definir explicitamente os campos que sabemos existir no banco de dados
      const allowedFields = [
        'diagnosticoEmocional', 'explicacaoBloqueio', 'caminhoLiberacao',
        'traco1Nome', 'traco1Percentual', 'traco1Dor', 'traco1Recurso',
        'traco2Nome', 'traco2Percentual', 'traco2Dor', 'traco2Recurso',
        'traco3Nome', 'traco3Percentual', 'traco3Dor', 'traco3Recurso',
        'acaoTraco1', 'acaoTraco2', 'acaoTraco3',
        'personalityPattern', 'analysisReport', 'strategicGuide', 'personalizedTips'
      ];

      // Filtrar apenas os campos permitidos
      const validUpdateData: any = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          validUpdateData[key] = (updateData as any)[key];
        } else {
          console.log(`Campo ignorado: ${key}`);
        }
      });

      console.log("Dados válidos para atualização:", Object.keys(validUpdateData).join(", "));

      // Atualiza os dados do resultado de análise apenas com campos válidos
      const [result] = await db
        .update(analysisResults)
        .set({
          ...validUpdateData,
          updatedAt: new Date().toISOString()
        })
        .where(eq(analysisResults.id, id))
        .returning();

      if (result) {
        console.log("Resultado atualizado com sucesso:", result.id);
        return result as AnalysisResult;
      }

      console.log("Nenhum resultado encontrado para atualizar com ID:", id);
      return undefined;
    } catch (error) {
      console.error("Erro ao atualizar resultado de análise:", error);
      throw error;
    }
  }

  // Body Scoring Table methods (Etapa 6)
  async createBodyScoringTable(scoringData: InsertBodyScoringTable): Promise<BodyScoringTable> {
    // Garantir que existe pelo menos o ID da solicitação de análise
    if (!scoringData.analysisRequestId) {
      throw new Error("analysisRequestId is required");
    }

    // Inicializar todos os campos com valores padrão (0)
    const baseData = {
      analysisRequestId: scoringData.analysisRequestId,
      // CRIATIVO
      creativoHead: scoringData.creativoHead || 0,
      creativoChest: scoringData.creativoChest || 0,
      creativoShoulder: scoringData.creativoShoulder || 0,
      creativoBack: scoringData.creativoBack || 0,
      creativoLegs: scoringData.creativoLegs || 0,
      // CONECTIVO
      conectivoHead: scoringData.conectivoHead || 0,
      conectivoChest: scoringData.conectivoChest || 0,
      conectivoShoulder: scoringData.conectivoShoulder || 0,
      conectivoBack: scoringData.conectivoBack || 0,
      conectivoLegs: scoringData.conectivoLegs || 0,
      // FORTE
      forteHead: scoringData.forteHead || 0,
      forteChest: scoringData.forteChest || 0,
      forteShoulder: scoringData.forteShoulder || 0,
      forteBack: scoringData.forteBack || 0,
      forteLegs: scoringData.forteLegs || 0,
      // LIDER
      liderHead: scoringData.liderHead || 0,
      liderChest: scoringData.liderChest || 0,
      liderShoulder: scoringData.liderShoulder || 0,
      liderBack: scoringData.liderBack || 0,
      liderLegs: scoringData.liderLegs || 0,
      // COMPETITIVO
      competitivoHead: scoringData.competitivoHead || 0,
      competitivoChest: scoringData.competitivoChest || 0,
      competitivoShoulder: scoringData.competitivoShoulder || 0,
      competitivoBack: scoringData.competitivoBack || 0,
      competitivoLegs: scoringData.competitivoLegs || 0,
      // Metadados
      scoredBy: scoringData.scoredBy || 'analista',
      scoringNotes: scoringData.scoringNotes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Calcular totais e percentuais
    const calculatedFields = this.calculateScoringTotals(baseData);

    // Mesclar os dados calculados com os dados básicos, mantendo o analysisRequestId
    const dataToInsert = {
      ...calculatedFields,
      analysisRequestId: baseData.analysisRequestId, // Garantir que o ID seja mantido
    };

    console.log("Inserindo tabela com analysisRequestId:", dataToInsert.analysisRequestId);

    // Inserir no banco de dados com os valores completos
    const [table] = await db.insert(bodyScoringTable).values(dataToInsert).returning();
    return table;
  }

  async getBodyScoringTable(analysisRequestId: number): Promise<BodyScoringTable | undefined> {
    const [table] = await db.select().from(bodyScoringTable)
      .where(eq(bodyScoringTable.analysisRequestId, analysisRequestId));
    return table;
  }

  async updateBodyScoringTable(id: number, scoringData: Partial<InsertBodyScoringTable>): Promise<BodyScoringTable | undefined> {
    // Primeiro, pegar tabela atual
    const [currentTable] = await db.select().from(bodyScoringTable)
      .where(eq(bodyScoringTable.id, id));

    if (!currentTable) return undefined;

    // Verificar se os dados já incluem os totais e padrões
    const hasCalculatedValues = (
      scoringData.primaryPattern !== undefined &&
      scoringData.secondaryPattern !== undefined &&
      scoringData.tertiaryPattern !== undefined &&
      (
        scoringData.creativoTotal !== undefined ||
        scoringData.conectivoTotal !== undefined ||
        scoringData.forteTotal !== undefined ||
        scoringData.liderTotal !== undefined ||
        scoringData.competitivoTotal !== undefined
      )
    );

    // Garantir que o analysisRequestId seja preservado
    // Se o cliente enviar um analysisRequestId, verificar se é o mesmo da tabela atual
    if (scoringData.analysisRequestId !== undefined && 
        scoringData.analysisRequestId !== currentTable.analysisRequestId) {
      console.log(
        `Aviso: Tentativa de alterar analysisRequestId de ${currentTable.analysisRequestId} para ${scoringData.analysisRequestId}`
      );
    }

    // Mesclar os dados atuais com os novos dados, garantindo que o analysisRequestId seja mantido
    const updatedData = {
      ...scoringData,
      // Manter o analysisRequestId original da tabela
      analysisRequestId: currentTable.analysisRequestId,
      updatedAt: new Date().toISOString()
    };

    // Atualizar a tabela com os dados fornecidos
    const [updatedTable] = await db.update(bodyScoringTable)
      .set(updatedData)
      .where(eq(bodyScoringTable.id, id))
      .returning();

    // Se os dados já incluem os totais e padrões calculados pelo front-end, não recalcular
    if (hasCalculatedValues) {
      return updatedTable;
    }

    // Caso contrário, recalcular os totais e percentuais
    return await this.calculateBodyScoringTableTotals(id);
  }

  async calculateBodyScoringTableTotals(id: number): Promise<BodyScoringTable | undefined> {
    // Pegar tabela atual
    const [currentTable] = await db.select().from(bodyScoringTable)
      .where(eq(bodyScoringTable.id, id));

    if (!currentTable) return undefined;

    // Calcular totais
    const calculatedFields = this.calculateScoringTotals(currentTable);

    // Garantir que o analysisRequestId seja mantido durante a atualização
    const dataToUpdate = {
      ...calculatedFields,
      // Manter o analysisRequestId original da tabela
      analysisRequestId: currentTable.analysisRequestId
    };

    console.log("Atualizando tabela com analysisRequestId:", dataToUpdate.analysisRequestId);

    // Atualizar tabela com os dados calculados
    const [updatedTable] = await db.update(bodyScoringTable)
      .set(dataToUpdate)
      .where(eq(bodyScoringTable.id, id))
      .returning();

    return updatedTable;
  }

  // Método auxiliar para calcular totais e percentuais
  private calculateScoringTotals(table: any): any {
    const patternTypes = ["criativo", "conectivo", "forte", "lider", "competitivo"];
    const bodyParts = ["Head", "Chest", "Shoulder", "Back", "Legs"];
    
    // Calcular totais por padrão
    const totals: Record<string, number> = {};
    const percentages: Record<string, number> = {};
    
    // Inicializar totais
    patternTypes.forEach(pattern => {
      let total = 0;
      bodyParts.forEach(part => {
        const fieldName = `${pattern}${part}`;
        total += Number(table[fieldName] || 0);
      });
      totals[pattern] = total;
    });

    // Calcular total geral e percentuais
    const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);

    // Calcular percentuais
    patternTypes.forEach(pattern => {
      percentages[pattern] = grandTotal > 0 ? Math.round((totals[pattern] / grandTotal) * 100) : 0;
    });

    // Identificar top 3 padrões
    const sortedPatterns = patternTypes
      .sort((a, b) => percentages[b] - percentages[a])
      .slice(0, 3);

    return {
      ...table,
      // Totais
      creativoTotal: totals.criativo,
      conectivoTotal: totals.conectivo,
      forteTotal: totals.forte,
      liderTotal: totals.lider,
      competitivoTotal: totals.competitivo,
      // Percentuais
      creativoPercentage: percentages.criativo,
      conectivoPercentage: percentages.conectivo,
      fortePercentage: percentages.forte,
      liderPercentage: percentages.lider,
      competitivoPercentage: percentages.competitivo,
      // Top 3 padrões
      primaryPattern: sortedPatterns[0]?.toUpperCase() || '',
      secondaryPattern: sortedPatterns[1]?.toUpperCase() || '',
      tertiaryPattern: sortedPatterns[2]?.toUpperCase() || ''
    };
  }

  // Emotional Pattern methods
  async createEmotionalPattern(pattern: InsertEmotionalPattern): Promise<EmotionalPattern> {
    const [emotionalPattern] = await db.insert(emotionalPatterns).values({
      ...pattern,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();
    return emotionalPattern;
  }

  async getEmotionalPatterns(): Promise<EmotionalPattern[]> {
    return await db.select().from(emotionalPatterns);
  }

  async getEmotionalPatternsByType(patternType: string): Promise<EmotionalPattern[]> {
    return await db.select().from(emotionalPatterns)
      .where(eq(emotionalPatterns.patternType, patternType));
  }

  async getEmotionalPatternsByArea(areaType: string): Promise<EmotionalPattern[]> {
    return await db.select().from(emotionalPatterns)
      .where(eq(emotionalPatterns.areaType, areaType));
  }

  async getEmotionalPatternsByIsPain(isPain: boolean): Promise<EmotionalPattern[]> {
    return await db.select().from(emotionalPatterns)
      .where(eq(emotionalPatterns.isPain, isPain));
  }

  async deleteAnalysisRequest(id: number): Promise<boolean> {
    try {
      // Verificar se a análise existe antes de tentar excluir
      const [analysisRequest] = await db.select().from(analysisRequests)
        .where(eq(analysisRequests.id, id));

      if (!analysisRequest) {
        console.error(`Análise com ID ${id} não encontrada para exclusão`);
        return false;
      }

      // Em vez de excluir definitivamente agora, atualizamos o status para "cancelado"
      // Isso implementa o soft delete com prazo de 30 dias para exclusão definitiva
      const [updated] = await db.update(analysisRequests)
        .set({ 
          status: "cancelado",
          // Adicionar timestamp para acompanhar quando foi solicitada a exclusão
          lastUpdateAt: new Date().toISOString() 
        })
        .where(eq(analysisRequests.id, id))
        .returning();

      // Implementação futura: criar um job que verifica diariamente análises canceladas há mais de 30 dias
      // e exclui definitivamente seus dados incluindo:
      // 1. Fotos relacionadas (tabela photoUploads)
      // 2. Tabela de pontuação corporal (tabela bodyScoringTable)
      // 3. Resultado de análise (tabela analysisResults)
      // 4. A própria solicitação de análise (tabela analysisRequests)

      return !!updated;
    } catch (error) {
      console.error(`Erro ao excluir análise ID ${id}:`, error);
      return false;
    }
  }
}

// Troque para usar o banco de dados PostgreSQL
export const storage = new DatabaseStorage();