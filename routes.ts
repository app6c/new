import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import Stripe from "stripe";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import { analysisRequestSchema, insertEmotionalPatternSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { isAuthenticated, isAdmin } from "./auth";

// Make sure Stripe API key is available
const stripeApiKey = process.env.STRIPE_SECRET_KEY || '';
if (!stripeApiKey) {
  console.warn('Missing STRIPE_SECRET_KEY environment variable. Payment processing will not work.');
}

const stripe = stripeApiKey ? new Stripe(stripeApiKey, {
  apiVersion: "2023-10-16" as any,
}) : null;

// Helper function to save uploaded photo data or handle test paths
const saveBase64Image = async (photoData: string, photoType: string): Promise<string> => {
  // Ensure uploads directory exists
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  
  if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Verifica se é uma string simples ou URL (para testes)
  if (!photoData.includes('data:image') && photoData.length < 1000) {
    console.log(`Usando caminho de teste para ${photoType}:`, photoData);
    
    // Create test file to ensure it exists
    const testFilename = `test_${photoType}.jpg`;
    const testFilePath = path.join(uploadsDir, testFilename);
    
    // If it doesn't exist yet, create an empty file
    if (!fs.existsSync(testFilePath)) {
      fs.writeFileSync(testFilePath, '');
    }
    
    return `/uploads/${testFilename}`;
  }

  // Extract the actual base64 content without the prefix
  const matches = photoData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (!matches || matches.length !== 3) {
    // Não é um formato base64 válido, vamos usar como caminho de teste
    console.log(`Formato inválido, usando como caminho de teste para ${photoType}`);
    return `/uploads/test_${photoType}.jpg`;
  }
  
  // Create a unique filename
  const filename = `${photoType}_${uuidv4()}.jpg`;
  
  // Write the file
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, matches[2], 'base64');
  
  return `/uploads/${filename}`;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Rota para criar um resultado de análise (Etapa 7 - Virada de Chave)
  app.post("/api/analysis-results", async (req: Request, res: Response) => {
    try {
      console.log("Recebendo requisição para criar resultado de análise:", {
        analysisRequestId: req.body.analysisRequestId,
        hasData: !!req.body
      });

      // Verificar se o usuário está autenticado
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        console.error("Erro: Usuário não autenticado ao tentar criar resultado");
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      console.log("Criando resultado de análise com dados:", {
        analysisRequestId: req.body.analysisRequestId,
        diagnóstico: req.body.diagnosticoEmocional ? req.body.diagnosticoEmocional.substring(0, 30) + '...' : 'Não fornecido',
        explicação: req.body.explicacaoBloqueio ? req.body.explicacaoBloqueio.substring(0, 30) + '...' : 'Não fornecido',
        caminho: req.body.caminhoLiberacao ? req.body.caminhoLiberacao.substring(0, 30) + '...' : 'Não fornecido'
      });
      
      if (!req.body.analysisRequestId) {
        console.error("Erro: analysisRequestId não fornecido nos dados da análise");
        return res.status(400).json({
          message: "Erro ao criar resultado de análise: analysisRequestId é obrigatório",
          detail: "É necessário fornecer o ID da solicitação de análise"
        });
      }
      
      if (!req.body.diagnosticoEmocional || !req.body.explicacaoBloqueio || !req.body.caminhoLiberacao) {
        console.error("Erro: Campos obrigatórios não fornecidos:", {
          diagnosticoEmocional: !!req.body.diagnosticoEmocional,
          explicacaoBloqueio: !!req.body.explicacaoBloqueio,
          caminhoLiberacao: !!req.body.caminhoLiberacao
        });
        
        return res.status(400).json({
          message: "Erro ao criar resultado de análise: campos obrigatórios não fornecidos",
          detail: "É necessário fornecer diagnóstico emocional, explicação do bloqueio e caminho de liberação"
        });
      }
      
      const result = await storage.createAnalysisResult(req.body);
      console.log(`Resultado de análise criado com sucesso. ID: ${result.id}, para análise: ${result.analysisRequestId}`);
      
      // Atualizar a solicitação de análise para indicar que tem um resultado disponível
      if (result.analysisRequestId) {
        await storage.markAnalysisRequestHasResult(result.analysisRequestId, true);
      }
      console.log(`Análise ID ${result.analysisRequestId} marcada com hasResult = true`);
      
      res.status(201).json({ 
        resultId: result.id, 
        message: "Resultado de análise criado com sucesso",
        data: {
          id: result.id,
          analysisRequestId: result.analysisRequestId
        }
      });
    } catch (error: any) {
      console.error("Erro ao criar resultado de análise:", error);
      res.status(500).json({ 
        message: `Erro ao criar resultado de análise: ${error.message}`,
        detail: error.stack
      });
    }
  });

  // Rota para obter um resultado de análise por ID de solicitação
  app.get("/api/analysis-results/:analysisRequestId", async (req: Request, res: Response) => {
    try {
      // Verificar se o ID é undefined, 'undefined' ou 'null'
      if (!req.params.analysisRequestId || req.params.analysisRequestId === 'undefined' || req.params.analysisRequestId === 'null') {
        console.log("Erro na busca do resultado de análise: ID inválido ou ausente:", req.params.analysisRequestId);
        return res.status(404).json({ 
          message: "Resultado de análise não encontrado: ID inválido",
          detail: "ID inválido ou ausente na requisição" 
        });
      }
      
      const analysisRequestId = parseInt(req.params.analysisRequestId);
      console.log("Buscando resultado de análise para análise ID:", analysisRequestId);
      
      if (isNaN(analysisRequestId)) {
        console.log("Erro na busca do resultado de análise: ID não é um número:", req.params.analysisRequestId);
        return res.status(400).json({ 
          message: "ID de solicitação de análise inválido",
          detail: "O ID da análise deve ser um número"
        });
      }
      
      const result = await storage.getAnalysisResult(analysisRequestId);
      
      if (!result) {
        console.log(`Resultado de análise não encontrado para análise ID: ${analysisRequestId}`);
        return res.status(404).json({ 
          message: "Resultado de análise não encontrado", 
          detail: `Não existe resultado para a análise ID: ${analysisRequestId}. Verifique se a análise foi concluída.`
        });
      }
      
      console.log(`Resultado de análise encontrado: ID ${result.id} para análise ${analysisRequestId}`);
      res.status(200).json(result);
    } catch (error: any) {
      console.error("Erro ao buscar resultado de análise:", error);
      res.status(500).json({ 
        message: `Erro ao buscar resultado de análise: ${error.message}`,
        detail: error.stack
      });
    }
  });

  // Rota para atualizar um resultado de análise
  app.patch("/api/analysis-results/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Remover campos problemáticos da solicitação antes de enviar
      const updatePayload = { ...req.body };
      // Remover campos que não existem no banco
      delete updatePayload.regenerationRequested;
      delete updatePayload.regenerationRequestedAt;
      delete updatePayload.isRegenerated;
      
      // Garantir que completedAt não seja enviado (pode causar problemas)
      delete updatePayload.completedAt;
      
      console.log("Enviando para atualização:", Object.keys(updatePayload).join(", "));
      
      const updatedResult = await storage.updateAnalysisResult(id, updatePayload);
      
      if (!updatedResult) {
        return res.status(404).json({ message: "Resultado de análise não encontrado" });
      }
      
      // Atualizar a solicitação de análise para indicar que tem um resultado disponível
      if (updatedResult.analysisRequestId) {
        await storage.markAnalysisRequestHasResult(updatedResult.analysisRequestId, true);
      }
      console.log(`Análise ID ${updatedResult.analysisRequestId} marcada com hasResult = true após atualização do resultado`);
      
      res.status(200).json({ 
        message: "Resultado de análise atualizado com sucesso", 
        result: updatedResult 
      });
    } catch (error: any) {
      console.error("Erro ao atualizar resultado de análise:", error);
      res.status(500).json({ message: `Erro ao atualizar resultado de análise: ${error.message}` });
    }
  });
  // Create a new analysis request
  app.post("/api/analysis-requests", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Verificação mais detalhada de autenticação
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        console.error("Erro de autenticação: usuário não está autenticado");
        return res.status(401).json({ 
          message: "Não autorizado",
          detail: "Sua sessão expirou. Por favor, faça login novamente."
        });
      }

      if (!req.user) {
        console.error("Erro de autenticação: objeto req.user está vazio");
        console.error("Tentativa de criar análise sem autenticação");
        return res.status(401).json({ 
          message: "Você precisa estar logado para enviar uma análise",
          detail: "Por favor, faça login antes de continuar"
        });
      }

      if (!req.body) {
        console.error("Requisição sem corpo de dados");
        return res.status(400).json({
          message: "Dados da análise não fornecidos",
          detail: "É necessário enviar os dados do formulário"
        });
      }

      // Log detalhado dos dados recebidos
      const userId = (req.user as any).id;
      console.log("Recebendo solicitação de análise:", {
        userId,
        analysisFor: req.body.analysisFor,
        priorityArea: req.body.priorityArea,
        photoCount: Object.keys(req.body).filter(key => key.includes('Photo')).length,
        hasComplaints: !!req.body.complaint1
      });

      if (!userId) {
        console.error("Erro: userId não encontrado no objeto do usuário");
        return res.status(400).json({
          message: "Erro ao criar análise: ID do usuário não encontrado",
          detail: "Por favor, faça logout e login novamente"
        });
      }

      // Garantir que userId está presente no corpo da requisição
      const requestData = {
        ...req.body,
        userId
      };

      // Validate the request body
      const validationResult = analysisRequestSchema.safeParse(requestData);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const validatedData = validationResult.data;
      
      // Save the photos as files and get their paths
      const photoTypes = ['frontBodyPhoto', 'backBodyPhoto', 'seriousFacePhoto', 'smilingFacePhoto'];
      const photoSavePromises = photoTypes.map(async (type) => {
        if (requestData[type as keyof typeof requestData]) {
          const photoPath = await saveBase64Image(
            requestData[type as keyof typeof requestData] as string, 
            type
          );
          return { type, path: photoPath };
        }
        return null;
      });
      
      const photoResults = await Promise.all(photoSavePromises);
      
      // Replace base64 data with file paths in the request
      photoResults.forEach(result => {
        if (result) {
          (requestData as any)[result.type] = result.path;
        }
      });
      
      // Create the analysis request
      const analysisRequest = await storage.createAnalysisRequest(requestData);
      
      res.status(201).json({
        requestId: analysisRequest.requestId,
        message: "Analysis request created successfully"
      });
    } catch (err: any) {
      console.error('Error creating analysis request:', err);
      res.status(500).json({ message: err.message || "An error occurred while creating the analysis request" });
    }
  });

  // Get an analysis request by ID or requestId
  app.get("/api/analysis-requests/:requestId", async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      
      // Validar requestId
      if (!requestId || requestId === 'undefined' || requestId === 'null') {
        console.error('Erro: requestId inválido:', requestId);
        return res.status(400).json({ message: "ID da solicitação inválido" });
      }
      
      let analysisRequest;
      
      // Verificar se o requestId é um número inteiro (ID)
      const numericId = parseInt(requestId);
      if (!isNaN(numericId) && String(numericId) === requestId) {
        console.log('Buscando análise com ID numérico:', numericId);
        analysisRequest = await storage.getAnalysisRequest(numericId);
      } else {
        // Caso contrário, tratamos como UUID
        console.log('Buscando análise com requestId (UUID):', requestId);
        analysisRequest = await storage.getAnalysisRequestByRequestId(requestId);
      }
      
      if (!analysisRequest) {
        console.error('Erro: análise não encontrada para ID/requestId:', requestId);
        return res.status(404).json({ 
          message: "Solicitação de análise não encontrada",
          detail: `A análise com identificador "${requestId}" não foi encontrada no sistema. Verifique se o ID está correto ou crie uma nova solicitação.`,
          requestIdType: !isNaN(numericId) ? 'numeric' : 'uuid',
          requestedId: requestId
        });
      }
      
      console.log('Análise encontrada:', { id: analysisRequest.id, requestId: analysisRequest.requestId });
      res.json(analysisRequest);
    } catch (err: any) {
      console.error('Erro ao buscar solicitação de análise:', err);
      res.status(500).json({ message: err.message || "Ocorreu um erro ao buscar a solicitação de análise" });
    }
  });

  // Create a payment intent for an analysis request
  app.post("/api/create-payment-intent", async (req: Request, res: Response) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe API key is not configured" });
    }
    
    try {
      const { requestId } = req.body;
      
      if (!requestId) {
        return res.status(400).json({ message: "Request ID is required" });
      }
      
      const analysisRequest = await storage.getAnalysisRequestByRequestId(requestId);
      
      if (!analysisRequest) {
        return res.status(404).json({ message: "Analysis request not found" });
      }
      
      // Valor fixo para a análise: $97.00 (9700 centavos)
      const ANALYSIS_PRICE = 9700;

      // Buscar informações do usuário para o email de recibo (se disponível)
      const user = await storage.getUser(analysisRequest.userId);
      
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: ANALYSIS_PRICE,
        currency: "usd",
        // Store the request ID in the metadata for reference
        metadata: {
          requestId: analysisRequest.requestId,
          userId: analysisRequest.userId.toString(),
          productName: "Análise Emocional 6 Camadas"
        },
        payment_method_types: ['card'],
        payment_method_options: {
          card: {
            installments: {
              enabled: true
            }
          }
        },
        description: 'Análise Emocional 6 Camadas'
      });
      
      // Atualizar o status da análise para "aguardando_pagamento" caso ainda não esteja
      if (analysisRequest.status !== "aguardando_pagamento") {
        await storage.updateAnalysisRequestStatus(analysisRequest.id, "aguardando_pagamento");
      }
      
      // Update the analysis request with the payment intent ID
      await storage.updateAnalysisRequestPayment(analysisRequest.id, paymentIntent.id);
      
      console.log(`Payment Intent criado para análise ID ${analysisRequest.id}, requestId ${requestId}, valor $97.00`);
      
      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      res.status(500).json({ message: err.message || "An error occurred while creating the payment intent" });
    }
  });

  // Webhook to handle Stripe events
  app.post("/api/stripe-webhook", async (req: Request, res: Response) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe API key is not configured" });
    }
    
    const payload = req.body;
    
    try {
      // Handle the event
      switch (payload.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = payload.data.object;
          const requestId = paymentIntent.metadata.requestId;
          
          if (requestId) {
            const analysisRequest = await storage.getAnalysisRequestByRequestId(requestId);
            if (analysisRequest) {
              await storage.updateAnalysisRequestStatus(analysisRequest.id, 'paid');
            }
          }
          break;
        default:
          console.log(`Unhandled event type ${payload.type}`);
      }
      
      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('Error handling Stripe webhook:', err);
      res.status(500).json({ message: err.message || "An error occurred while handling the Stripe webhook" });
    }
  });
  
  // Rota para obter as análises do usuário atual
  app.get("/api/user-analysis-requests", async (req: Request, res: Response) => {
    try {
      // Verificar se o usuário está autenticado e obter o ID do usuário
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const userId = (req.user as any).id;
      const userRole = (req.user as any).role;
      
      if (!userId) {
        return res.status(400).json({ message: "ID de usuário não encontrado" });
      }
      
      console.log(`Buscando análises para o usuário ID: ${userId} com role: ${userRole}`);
      
      // Se o usuário for um analista, retornar todas as análises
      let analysisRequests;
      if (userRole === 'admin' || userRole === 'analyst') {
        analysisRequests = await storage.getAllAnalysisRequests();
        console.log(`Usuário é analista, buscando todas as análises`);
        
        // Obter informações do usuário para cada análise
        const usersPromises = analysisRequests.map(analysis => storage.getUser(analysis.userId));
        const users = await Promise.all(usersPromises);
        
        // Adicionar nomes de usuários às análises
        analysisRequests = analysisRequests.map((analysis, index) => {
          const user = users[index];
          return {
            ...analysis,
            userName: user?.username || 'Usuário desconhecido'
          };
        });
      } else {
        // Caso contrário, buscar apenas as análises do usuário
        analysisRequests = await storage.getClientAnalysisRequests(userId);
      }
      
      // Para cada análise, adicionar ID do resultado se existir
      // Mantendo o campo hasResult original do banco de dados em vez de sobrescrevê-lo
      const analysisWithResults = await Promise.all(
        analysisRequests.map(async (request) => {
          const result = await storage.getAnalysisResult(request.id);
          return {
            ...request,
            // Não sobrescrevemos hasResult aqui mais, usando o valor do banco de dados
            resultId: result?.id
          };
        })
      );
      
      console.log(`Encontradas ${analysisWithResults.length} análises para o usuário ${userId}`);
      
      res.json(analysisWithResults);
    } catch (err: any) {
      console.error('Erro ao buscar análises do usuário:', err);
      res.status(500).json({ 
        message: err.message || "Ocorreu um erro ao buscar as análises", 
        error: err.stack
      });
    }
  });
  
  // Rota para obter todas as análises (apenas para analistas)
  app.get("/api/all-analysis-requests", async (req: Request, res: Response) => {
    try {
      // Verificar se o usuário está autenticado e se é um analista
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Verificar se é um analista
      if ((req.user as any).username !== "analista") {
        return res.status(403).json({ message: "Acesso não autorizado. Apenas analistas podem acessar essa rota." });
      }
      
      console.log(`Buscando todas as análises para o analista`);
      
      // Buscar todas as análises
      const analysisRequests = await storage.getAllAnalysisRequests();
      
      // Obter informações do usuário para cada análise
      const usersPromises = analysisRequests.map(analysis => storage.getUser(analysis.userId));
      const users = await Promise.all(usersPromises);
      
      // Combinar análises com informações do usuário
      const analysisWithUserInfo = analysisRequests.map((analysis, index) => {
        const user = users[index];
        return {
          ...analysis,
          userName: user?.username || 'Usuário desconhecido'
        };
      });
      
      // Ordenar por data (mais recentes primeiro)
      analysisWithUserInfo.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(`Encontradas ${analysisWithUserInfo.length} análises no total`);
      
      res.json(analysisWithUserInfo);
    } catch (err: any) {
      console.error('Erro ao buscar todas as análises:', err);
      res.status(500).json({ 
        message: err.message || "Ocorreu um erro ao buscar as análises", 
        error: err.stack
      });
    }
  });
  
  // Rota para liberar uma análise que está aguardando pagamento (aprovar manualmente)
  app.patch("/api/analysis-requests/:id/approve-payment", async (req: Request, res: Response) => {
    try {
      // Verificar se o usuário está autenticado e se é um analista
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Verificar se é um analista
      if ((req.user as any).username !== "analista") {
        return res.status(403).json({ message: "Acesso não autorizado. Apenas analistas podem acessar essa rota." });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Obter a análise atual
      const analysis = await storage.getAnalysisRequest(id);
      if (!analysis) {
        return res.status(404).json({ message: "Análise não encontrada" });
      }
      
      // Verificar se a análise está aguardando pagamento
      if (analysis.status !== "aguardando_pagamento") {
        return res.status(400).json({ 
          message: "Esta análise não está aguardando pagamento. Status atual: " + analysis.status
        });
      }
      
      // Atualizar o status para "aguardando_analise"
      const updatedAnalysis = await storage.updateAnalysisRequestStatus(id, "aguardando_analise");
      
      console.log(`Análise ID ${id} foi aprovada manualmente pelo analista ID ${(req.user as any).id} e agora está aguardando análise`);
      
      res.json({
        message: "Pagamento aprovado manualmente com sucesso. A análise está pronta para ser iniciada.",
        data: updatedAnalysis
      });
    } catch (err: any) {
      console.error('Erro ao aprovar pagamento:', err);
      res.status(500).json({ 
        message: err.message || "Ocorreu um erro ao aprovar o pagamento", 
        error: err.stack
      });
    }
  });

  // Rota para atualizar o status de uma análise para "em_analise" quando o analista começa a trabalhar
  app.patch("/api/analysis-requests/:id/start-analysis", async (req: Request, res: Response) => {
    try {
      // Verificar se o usuário está autenticado e se é um analista
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Verificar se é um analista
      if ((req.user as any).username !== "analista") {
        return res.status(403).json({ message: "Acesso não autorizado. Apenas analistas podem acessar essa rota." });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Obter a análise atual
      const analysis = await storage.getAnalysisRequest(id);
      if (!analysis) {
        return res.status(404).json({ message: "Análise não encontrada" });
      }
      
      // Verificar se a análise está em estado que permite iniciar a análise
      if (analysis.status === "aguardando_pagamento") {
        return res.status(400).json({ message: "Esta análise ainda aguarda pagamento e não pode ser analisada." });
      }
      
      if (analysis.status === "em_analise" || analysis.status === "concluido") {
        return res.status(400).json({ 
          message: `Esta análise já está ${analysis.status === "em_analise" ? "em análise" : "concluída"}.`
        });
      }
      
      // Atualizar o status para "em_analise"
      const updatedAnalysis = await storage.updateAnalysisRequestStatus(id, "em_analise");
      
      // Atribuir o analista atual à análise
      const assignedAnalysis = await storage.assignAnalystToRequest(id, (req.user as any).id);
      
      console.log(`Análise ID ${id} agora está em análise pelo analista ID ${(req.user as any).id}`);
      
      res.json({
        message: "Análise iniciada com sucesso",
        data: assignedAnalysis
      });
    } catch (err: any) {
      console.error('Erro ao iniciar análise:', err);
      res.status(500).json({ 
        message: err.message || "Ocorreu um erro ao iniciar a análise", 
        error: err.stack
      });
    }
  });

  // Rota para finalizar uma análise (marcar como concluída e com hasResult = true)
  app.patch("/api/analysis-requests/:id/status-concluido", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Obter a análise atual
      const analysis = await storage.getAnalysisRequest(id);
      if (!analysis) {
        return res.status(404).json({ message: "Análise não encontrada" });
      }
      
      // Verificar se existe um resultado de análise
      const result = await storage.getAnalysisResult(id);
      if (!result) {
        return res.status(400).json({ 
          message: "Não é possível concluir uma análise sem resultados. Crie um resultado antes de marcar como concluído." 
        });
      }
      
      // Atualizar o status para "concluido"
      const updatedAnalysis = await storage.updateAnalysisRequestStatus(id, "concluido");
      
      if (!updatedAnalysis) {
        return res.status(500).json({ message: "Erro ao atualizar status da análise" });
      }
      
      // Marcar que a análise tem um resultado disponível
      // Esta marcação é usada na interface para mostrar o botão de visualização
      await storage.markAnalysisRequestHasResult(id, true);
      
      console.log(`Análise ID ${id} marcada como concluída e com resultado disponível`);
      
      res.status(200).json({
        message: "Análise concluída com sucesso e resultado disponibilizado para o cliente",
        data: updatedAnalysis
      });
    } catch (err: any) {
      console.error('Erro ao concluir análise:', err);
      res.status(500).json({ 
        message: err.message || "Ocorreu um erro ao concluir a análise", 
        error: err.stack
      });
    }
  });

  // Emotional Patterns API
  // Create a new emotional pattern
  app.post("/api/emotional-patterns", async (req: Request, res: Response) => {
    try {
      // Validate the request body
      const validationResult = insertEmotionalPatternSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const patternData = validationResult.data;
      
      // Create the emotional pattern
      const emotionalPattern = await storage.createEmotionalPattern(patternData);
      
      res.status(201).json({
        patternId: emotionalPattern.id,
        message: "Emotional pattern created successfully",
        data: emotionalPattern
      });
    } catch (err: any) {
      console.error('Error creating emotional pattern:', err);
      res.status(500).json({ message: err.message || "An error occurred while creating the emotional pattern" });
    }
  });

  // Get all emotional patterns
  app.get("/api/emotional-patterns", async (_req: Request, res: Response) => {
    try {
      const patterns = await storage.getEmotionalPatterns();
      res.json(patterns);
    } catch (err: any) {
      console.error('Error fetching emotional patterns:', err);
      res.status(500).json({ message: err.message || "An error occurred while fetching emotional patterns" });
    }
  });

  // Get emotional patterns by pattern type (CRIATIVO, CONECTIVO, etc.)
  app.get("/api/emotional-patterns/type/:patternType", async (req: Request, res: Response) => {
    try {
      const { patternType } = req.params;
      const patterns = await storage.getEmotionalPatternsByType(patternType);
      res.json(patterns);
    } catch (err: any) {
      console.error('Error fetching emotional patterns by type:', err);
      res.status(500).json({ message: err.message || "An error occurred while fetching emotional patterns by type" });
    }
  });

  // Get emotional patterns by area type (Pessoal, Relacionamentos, Profissional)
  app.get("/api/emotional-patterns/area/:areaType", async (req: Request, res: Response) => {
    try {
      const { areaType } = req.params;
      const patterns = await storage.getEmotionalPatternsByArea(areaType);
      res.json(patterns);
    } catch (err: any) {
      console.error('Error fetching emotional patterns by area:', err);
      res.status(500).json({ message: err.message || "An error occurred while fetching emotional patterns by area" });
    }
  });

  // Get emotional patterns by is pain (true = Dor, false = Recurso)
  app.get("/api/emotional-patterns/is-pain/:isPain", async (req: Request, res: Response) => {
    try {
      const isPain = req.params.isPain === 'true';
      const patterns = await storage.getEmotionalPatternsByIsPain(isPain);
      res.json(patterns);
    } catch (err: any) {
      console.error('Error fetching emotional patterns by is pain:', err);
      res.status(500).json({ message: err.message || "An error occurred while fetching emotional patterns by is pain" });
    }
  });

  // ETAPA 6: Rotas para Tabela de Pontuação Corporal
  // Criar nova tabela de pontuação corporal
  app.post("/api/body-scoring-tables", async (req: Request, res: Response) => {
    try {
      console.log("Recebendo requisição para criar tabela de pontuação:", {
        analysisRequestId: req.body.analysisRequestId,
        body: req.body
      });
      
      // Verificar se analysisRequestId está presente
      if (req.body.analysisRequestId === undefined || req.body.analysisRequestId === null) {
        return res.status(400).json({ 
          message: "analysisRequestId é obrigatório",
          receivedValue: req.body.analysisRequestId
        });
      }
      
      // Converter para número e verificar se é válido
      const analysisRequestId = Number(req.body.analysisRequestId);
      
      if (isNaN(analysisRequestId) || analysisRequestId <= 0) {
        return res.status(400).json({ 
          message: "analysisRequestId deve ser um número válido maior que zero",
          receivedValue: req.body.analysisRequestId,
          parsed: analysisRequestId
        });
      }

      // Verificar se a análise existe antes de criar a tabela
      const analysis = await storage.getAnalysisRequest(analysisRequestId);
      if (!analysis) {
        return res.status(404).json({
          message: `Análise com ID ${analysisRequestId} não encontrada`
        });
      }
      
      // Garantir que o analysisRequestId é passado como número
      const insertData = {
        ...req.body,
        analysisRequestId: analysisRequestId // Usar o valor numérico validado
      };
      
      console.log("Criando tabela de pontuação com dados:", {
        analysisRequestId: insertData.analysisRequestId,
        scoredBy: insertData.scoredBy
      });
      
      const bodyScoringTable = await storage.createBodyScoringTable(insertData);
      
      res.status(201).json({
        tableId: bodyScoringTable.id,
        message: "Tabela de pontuação corporal criada com sucesso",
        data: bodyScoringTable
      });
    } catch (err: any) {
      console.error('Erro ao criar tabela de pontuação corporal:', err);
      res.status(500).json({ message: err.message || "Ocorreu um erro ao criar a tabela de pontuação corporal" });
    }
  });

  // Obter tabela de pontuação corporal por ID de solicitação de análise
  app.get("/api/body-scoring-tables/request/:analysisRequestId", async (req: Request, res: Response) => {
    try {
      // Verificar se o ID é undefined, 'undefined' ou 'null'
      if (!req.params.analysisRequestId || req.params.analysisRequestId === 'undefined' || req.params.analysisRequestId === 'null') {
        console.log("Erro na busca da tabela de pontuação: ID inválido ou ausente:", req.params.analysisRequestId);
        return res.status(404).json({ message: "Tabela de pontuação corporal não encontrada: ID inválido" });
      }
      
      const analysisRequestId = parseInt(req.params.analysisRequestId);
      console.log("Buscando tabela de pontuação para análise ID:", analysisRequestId);
      
      if (isNaN(analysisRequestId)) {
        console.log("Erro na busca da tabela de pontuação: ID não é um número:", req.params.analysisRequestId);
        return res.status(400).json({ message: "ID de solicitação de análise inválido" });
      }
      
      const bodyScoringTable = await storage.getBodyScoringTable(analysisRequestId);
      if (!bodyScoringTable) {
        console.log(`Tabela de pontuação não encontrada para análise ID: ${analysisRequestId}`);
        return res.status(404).json({ 
          message: "Tabela de pontuação corporal não encontrada", 
          detail: `Não existe tabela para a análise ID: ${analysisRequestId}. Verifique se a tabela foi salva.`
        });
      }
      
      console.log(`Tabela de pontuação encontrada: ID ${bodyScoringTable.id} para análise ${analysisRequestId}`);
      
      res.json(bodyScoringTable);
    } catch (err: any) {
      console.error('Erro ao buscar tabela de pontuação corporal:', err);
      res.status(500).json({ message: err.message || "Ocorreu um erro ao buscar a tabela de pontuação corporal" });
    }
  });

  // Atualizar tabela de pontuação corporal
  app.patch("/api/body-scoring-tables/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const updatedTable = await storage.updateBodyScoringTable(id, req.body);
      if (!updatedTable) {
        return res.status(404).json({ message: "Tabela de pontuação corporal não encontrada" });
      }
      
      res.json({
        message: "Tabela de pontuação corporal atualizada com sucesso",
        data: updatedTable
      });
    } catch (err: any) {
      console.error('Erro ao atualizar tabela de pontuação corporal:', err);
      res.status(500).json({ message: err.message || "Ocorreu um erro ao atualizar a tabela de pontuação corporal" });
    }
  });

  // Recalcular totais da tabela de pontuação corporal
  app.post("/api/body-scoring-tables/:id/calculate-totals", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const calculatedTable = await storage.calculateBodyScoringTableTotals(id);
      if (!calculatedTable) {
        return res.status(404).json({ message: "Tabela de pontuação corporal não encontrada" });
      }
      
      res.json({
        message: "Totais recalculados com sucesso",
        data: calculatedTable
      });
    } catch (err: any) {
      console.error('Erro ao calcular totais da tabela de pontuação:', err);
      res.status(500).json({ message: err.message || "Ocorreu um erro ao calcular os totais da tabela de pontuação" });
    }
  });

  // Rota para marcar/desmarcar um resultado como disponível para visualização
  app.patch("/api/analysis-requests/:id/has-result", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const { hasResult } = req.body;
      if (typeof hasResult !== 'boolean') {
        return res.status(400).json({ message: "O campo hasResult é obrigatório e deve ser um booleano" });
      }
      
      const analysis = await storage.getAnalysisRequest(id);
      if (!analysis) {
        return res.status(404).json({ message: "Análise não encontrada" });
      }
      
      const updatedAnalysis = await storage.markAnalysisRequestHasResult(id, hasResult);
      
      if (!updatedAnalysis) {
        return res.status(500).json({ message: "Erro ao atualizar disponibilidade do resultado" });
      }
      
      console.log(`Análise ID ${id} marcada com hasResult = ${hasResult}`);
      
      res.status(200).json({
        message: hasResult ? "Resultado disponibilizado para visualização" : "Resultado ocultado da visualização",
        data: updatedAnalysis
      });
    } catch (err: any) {
      console.error("Erro ao atualizar disponibilidade do resultado:", err.message);
      res.status(500).json({ message: "Erro ao atualizar disponibilidade do resultado" });
    }
  });
  
  // Rota para regerar a análise (gerar ou atualizar o resultado)
  app.post("/api/analysis-requests/:id/regenerate", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Verificar autenticação
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Primeiro, verificamos se a análise existe
      const analysisRequest = await storage.getAnalysisRequest(id);
      
      if (!analysisRequest) {
        return res.status(404).json({ message: "Solicitação de análise não encontrada" });
      }
      
      // Permitir regeneração se o usuário é dono da análise ou é o analista
      if (analysisRequest.userId !== (req.user as any).id && (req.user as any).username !== 'analista') {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Buscar a tabela de pontuação para determinar os padrões predominantes
      const bodyScoringTable = await storage.getBodyScoringTable(id);
      
      if (!bodyScoringTable) {
        return res.status(400).json({ 
          message: "Não foi possível regenerar a análise: tabela de pontuação não encontrada",
          detail: "Complete a etapa de pontuação corporal antes de gerar o resultado"
        });
      }
      
      // Buscar o resultado atual (se existir)
      const currentResult = await storage.getAnalysisResult(id);
      
      if (!currentResult) {
        return res.status(400).json({ 
          message: "Não foi possível regenerar a análise: resultado base não encontrado",
          detail: "Crie um resultado inicial antes de regenerar"
        });
      }
      
      // Gerar textos para o diagnóstico emocional, explicação do bloqueio e caminho de liberação
      // com base nos padrões emocionais predominantes
      
      // Mapear área prioritária para um formato mais legível
      const areaMap: Record<string, string> = {
        'health': 'Saúde',
        'relationships': 'Relacionamentos',
        'professional': 'Profissional/Financeira'
      };
      
      const priorityArea = areaMap[analysisRequest.priorityArea] || analysisRequest.priorityArea;
      
      // Obter os nomes dos padrões predominantes em ordem
      const patterns = [
        { name: 'CRIATIVO', value: bodyScoringTable.creativoPercentage },
        { name: 'CONECTIVO', value: bodyScoringTable.conectivoPercentage },
        { name: 'FORTE', value: bodyScoringTable.fortePercentage },
        { name: 'LIDER', value: bodyScoringTable.liderPercentage },
        { name: 'COMPETITIVO', value: bodyScoringTable.competitivoPercentage }
      ].sort((a, b) => b.value - a.value);
      
      // Os dois padrões mais predominantes que somam mais de 50%
      const dominantPatterns = patterns.slice(0, 2);
      const dominantSum = dominantPatterns[0].value + (dominantPatterns[1]?.value || 0);
      
      // Diagnóstico Emocional - Bloco 1
      let diagnosticoEmocional = `Análise Emocional - Perfil ${dominantPatterns[0].name}\n\n`;
      diagnosticoEmocional += `Olá! Analisei seu perfil emocional com base nas suas fotos e informações fornecidas.\n\n`;
      diagnosticoEmocional += `Sua distribuição de padrões emocionais mostra uma predominância de ${dominantPatterns[0].name} (${dominantPatterns[0].value}%)`;
      
      if (dominantPatterns[1]) {
        diagnosticoEmocional += ` combinado com ${dominantPatterns[1].name} (${dominantPatterns[1].value}%), o que revela um perfil emocional interessante.\n\n`;
      } else {
        diagnosticoEmocional += `, o que indica um perfil emocional bastante definido.\n\n`;
      }
      
      // Adicionar informações sobre as queixas do cliente
      diagnosticoEmocional += `Suas queixas principais na área de ${priorityArea} indicam:\n`;
      diagnosticoEmocional += `${analysisRequest.complaint1}\n`;
      
      if (analysisRequest.complaint2) {
        diagnosticoEmocional += `${analysisRequest.complaint2}\n`;
      }
      
      if (analysisRequest.complaint3) {
        diagnosticoEmocional += `${analysisRequest.complaint3}\n`;
      }
      
      diagnosticoEmocional += `\nEsta análise fornecerá insights sobre como seu perfil emocional está relacionado com seus desafios atuais.`;
      
      // Explicação do Bloqueio - Parte do Bloco 1
      let explicacaoBloqueio = `Bloqueios Emocionais - ${dominantPatterns[0].name}\n\n`;
      
      // Descrições específicas para cada padrão
      const bloqueioPorPadrao: Record<string, string> = {
        'CRIATIVO': `As pessoas com padrão CRIATIVO frequentemente enfrentam bloqueios relacionados à expressão autêntica, têm dificuldade de se sentirem compreendidas e podem sofrer de hipersensibilidade emocional. Na área de ${priorityArea}, isso se manifesta como uma tendência a se sentir incompreendido ou julgado, levando a um ciclo de auto-sabotagem.`,
        
        'CONECTIVO': `No padrão CONECTIVO, os bloqueios geralmente envolvem dependência emocional, necessidade excessiva de aceitação e dificuldade em estabelecer limites saudáveis. Isso afeta especialmente sua área de ${priorityArea}, onde você pode estar constantemente buscando validação externa e se sacrificando para agradar os outros.`,
        
        'FORTE': `O padrão FORTE traz bloqueios relacionados à rigidez emocional, dificuldade de adaptação a mudanças e resistência em demonstrar vulnerabilidade. Na área de ${priorityArea}, isso se manifesta como uma tendência a controlar excessivamente situações e pessoas, gerando estresse e tensão.`,
        
        'LIDER': `Pessoas com padrão LIDER frequentemente enfrentam bloqueios relacionados à necessidade de reconhecimento, perfeccionismo e medo do fracasso. Na área de ${priorityArea}, isso se traduz em uma pressão constante por resultados e dificuldade em delegar ou confiar no trabalho dos outros.`,
        
        'COMPETITIVO': `O padrão COMPETITIVO traz bloqueios relacionados à ansiedade por resultados, comparação constante com outros e medo de perder oportunidades. Isso impacta diretamente sua área de ${priorityArea}, onde você pode estar se cobrando excessivamente e sentindo que nunca é suficiente.`
      };
      
      // Adicionar descrição do padrão predominante
      explicacaoBloqueio += bloqueioPorPadrao[dominantPatterns[0].name] || `O padrão ${dominantPatterns[0].name} está criando bloqueios na área de ${priorityArea} que precisam ser trabalhados.`;
      
      // Se houver um segundo padrão significativo, adicionar sua influência
      if (dominantPatterns[1] && dominantPatterns[1].value > 20) {
        explicacaoBloqueio += `\n\nAlém disso, a influência do padrão ${dominantPatterns[1].name} (${dominantPatterns[1].value}%) intensifica esses desafios, adicionando `;
        
        // Descrição da combinação
        const combinacoes: Record<string, Record<string, string>> = {
          'CRIATIVO': {
            'CONECTIVO': `uma tendência à hipersensibilidade emocional e necessidade de validação`,
            'FORTE': `um conflito entre expressão emocional e auto-controle`,
            'LIDER': `uma pressão interna por perfeição e originalidade`,
            'COMPETITIVO': `uma ansiedade constante por reconhecimento e destaque`
          },
          'CONECTIVO': {
            'CRIATIVO': `uma maior sensibilidade às opiniões alheias e medo de rejeição`,
            'FORTE': `um padrão de relacionamentos baseados em controle emocional`,
            'LIDER': `uma tendência a buscar aprovação através de realizações`,
            'COMPETITIVO': `uma necessidade de ser o preferido e indispensável aos outros`
          },
          'FORTE': {
            'CRIATIVO': `uma dificuldade em expressar emoções de forma saudável`,
            'CONECTIVO': `um padrão de controle nas relações interpessoais`,
            'LIDER': `uma rigidez excessiva na busca por resultados`,
            'COMPETITIVO': `uma pressão constante por demonstrar força e resistência`
          },
          'LIDER': {
            'CRIATIVO': `uma autocobrança por inovação e excelência constantes`,
            'CONECTIVO': `um uso do status e realizações para obter conexão e aprovação`,
            'FORTE': `uma rigidez na forma de liderar e tomar decisões`,
            'COMPETITIVO': `uma obsessão por estar sempre à frente e no controle`
          },
          'COMPETITIVO': {
            'CRIATIVO': `uma necessidade de ser único e destacar-se constantemente`,
            'CONECTIVO': `um padrão de competir por atenção e afeto`,
            'FORTE': `uma inflexibilidade na maneira de buscar resultados`,
            'LIDER': `uma comparação constante com outros líderes e referências`
          }
        };
        
        // Adicionar a descrição específica da combinação ou uma genérica
        explicacaoBloqueio += combinacoes[dominantPatterns[0].name]?.[dominantPatterns[1].name] || 
          `elementos que intensificam os desafios do padrão predominante`;
        
        explicacaoBloqueio += `.`;
      }
      
      // Relacionar com as queixas específicas
      explicacaoBloqueio += `\n\nSuas queixas sobre "${analysisRequest.complaint1}"${analysisRequest.complaint2 ? ' e "' + analysisRequest.complaint2 + '"' : ''} são manifestações diretas desses bloqueios emocionais.`;
      
      // Caminho de Liberação - Também parte do Bloco 1
      let caminhoLiberacao = `Caminhos para Liberação Emocional - ${dominantPatterns[0].name}\n\n`;
      
      // Sugestões específicas para cada padrão
      const liberacaoPorPadrao: Record<string, string> = {
        'CRIATIVO': `Para o padrão CRIATIVO, o caminho de liberação envolve encontrar canais saudáveis de expressão emocional, desenvolver autovalidação e criar limites emocionais claros. Na área de ${priorityArea}, recomendo:\n\n1. Práticas diárias de expressão criativa sem julgamento\n2. Exercícios de auto-aceitação e redução da autocrítica\n3. Cultivar relacionamentos que respeitem sua sensibilidade\n4. Desenvolver técnicas para regular emoções intensas`,
        
        'CONECTIVO': `Para o padrão CONECTIVO, o caminho de liberação passa por desenvolver autonomia emocional, estabelecer limites saudáveis e construir auto-estima independente de validação externa. Na área de ${priorityArea}, sugiro:\n\n1. Praticar dizer "não" quando necessário, sem culpa\n2. Identificar e validar suas próprias necessidades primeiro\n3. Desenvolver atividades que promovam independência\n4. Buscar relacionamentos baseados em equilíbrio, não em dependência`,
        
        'FORTE': `Para o padrão FORTE, o caminho de liberação envolve desenvolver flexibilidade emocional, praticar vulnerabilidade seletiva e cultivar adaptabilidade. Na área de ${priorityArea}, recomendo:\n\n1. Exercícios de respiração e relaxamento para reduzir a rigidez\n2. Praticar a expressão controlada de emoções em ambientes seguros\n3. Desenvolver estratégias adaptativas para lidar com mudanças\n4. Cultivar momentos de descontração e leveza`,
        
        'LIDER': `Para o padrão LIDER, o caminho de liberação passa por desenvolver autocompaixão, redefinir sucesso além do reconhecimento externo e cultivar equilíbrio. Na área de ${priorityArea}, sugiro:\n\n1. Estabelecer metas realistas e celebrar pequenas conquistas\n2. Praticar delegar tarefas e confiar na capacidade dos outros\n3. Desenvolver atividades que tragam satisfação pessoal, não apenas status\n4. Cultivar momentos de descanso sem culpa`,
        
        'COMPETITIVO': `Para o padrão COMPETITIVO, o caminho de liberação envolve desenvolver autoaceitação, definir sucesso em termos pessoais e cultivar cooperação. Na área de ${priorityArea}, recomendo:\n\n1. Praticar gratidão pelo que já conquistou e pelo que já tem\n2. Focar em competir consigo mesmo, não com os outros\n3. Desenvolver projetos colaborativos que valorizem contribuições diversas\n4. Cultivar hobbies sem pressão por performance`
      };
      
      // Adicionar liberação para o padrão predominante
      caminhoLiberacao += liberacaoPorPadrao[dominantPatterns[0].name] || `Para trabalhar com o padrão ${dominantPatterns[0].name}, recomendo focar em desenvolver maior consciência emocional e praticar técnicas específicas de regulação.`;
      
      // Conclusão positiva
      caminhoLiberacao += `\n\nEstes são apenas os primeiros passos. Ao avançar nesse caminho de autoconhecimento, você descobrirá novas camadas de compreensão sobre seus padrões emocionais e como transformá-los em recursos poderosos para sua vida.`;
      
      // Atualizar o resultado com os novos textos gerados
      const updateData = {
        diagnosticoEmocional,
        explicacaoBloqueio,
        caminhoLiberacao,
        
        // Também atualizar os dados dos traços se necessário
        traco1Nome: bodyScoringTable.primaryPattern || dominantPatterns[0].name,
        traco1Percentual: dominantPatterns[0].value,
        
        traco2Nome: bodyScoringTable.secondaryPattern || dominantPatterns[1]?.name || '',
        traco2Percentual: dominantPatterns[1]?.value || 0,
        
        traco3Nome: bodyScoringTable.tertiaryPattern || patterns[2]?.name || '',
        traco3Percentual: patterns[2]?.value || 0,
        
        // Informações para os blocos do estado de dor e recurso na área prioritária
        block2PriorityArea: priorityArea,
      };
      
      // Atualizar o resultado
      await storage.updateAnalysisResult(currentResult.id, updateData);
      console.log(`Resultado ID ${currentResult.id} atualizado com dados gerados automaticamente`);
      
      // Marcar a análise como tendo resultado novamente
      await storage.markAnalysisRequestHasResult(id, true);
      console.log(`Análise ID ${id} marcada com hasResult = true após regeneração`);
      
      // Retornar sucesso
      const updatedRequest = await storage.getAnalysisRequest(id);
      const updatedResult = await storage.getAnalysisResult(id);
      
      console.log(`Regeneração concluída para análise ID ${id}`);
      
      res.status(200).json({ 
        message: "Solicitação de regeneração da análise realizada com sucesso",
        data: {
          request: updatedRequest,
          result: {
            id: updatedResult?.id,
            analysisRequestId: updatedResult?.analysisRequestId,
            diagnosticoResumido: updatedResult?.diagnosticoEmocional?.substring(0, 100) + '...'
          }
        }
      });
      
    } catch (err: any) {
      console.error('Erro ao regerar análise:', err.message);
      res.status(500).json({ 
        message: `Erro ao solicitar regeneração da análise: ${err.message}`,
        detail: err.stack
      });
    }
  });

  // Rota para excluir solicitação de análise
  app.delete("/api/analysis-requests/:id", async (req: Request, res: Response) => {
    try {
      // Verificar se o usuário está autenticado
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de análise inválido" });
      }

      // Verificar se a análise existe e se o usuário tem permissão para excluí-la
      const analysisRequest = await storage.getAnalysisRequest(id);
      if (!analysisRequest) {
        return res.status(404).json({ message: "Análise não encontrada" });
      }

      const userId = (req.user as any).id;
      const isAdmin = (req.user as any).username === "analista";

      // Apenas o proprietário da análise ou um analista/admin pode excluir
      if (!isAdmin && analysisRequest.userId !== userId) {
        return res.status(403).json({ message: "Você não tem permissão para excluir esta análise" });
      }

      const deleted = await storage.deleteAnalysisRequest(id);
      if (deleted) {
        return res.status(200).json({ message: "Análise cancelada com sucesso. Será excluída permanentemente em 30 dias" });
      } else {
        return res.status(500).json({ message: "Erro ao cancelar análise" });
      }
    } catch (err: any) {
      console.error('Erro ao excluir análise:', err);
      res.status(500).json({ message: err.message || "Ocorreu um erro ao excluir a análise" });
    }
  });

  // Serve static uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  const httpServer = createServer(app);

  return httpServer;
}
