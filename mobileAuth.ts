import { Request, Response, NextFunction } from 'express';
import { generateKeySync, createHmac } from 'crypto';
import { storage } from './storage';

// Armazenamento temporário de tokens para usuários
interface TokenEntry {
  userId: number;
  token: string;
  username: string;
  createdAt: Date;
  expiresAt: Date;
}

// Cache de tokens (em memória para desenvolvimento)
const tokenCache: Record<string, TokenEntry> = {};

// Segredo para assinar tokens
const TOKEN_SECRET = process.env.SESSION_SECRET || 'mobile_auth_secret_key';

// Tempo de expiração do token (7 dias)
const TOKEN_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos

// Gerar token aleatório
function generateToken(): string {
  const buffer = generateKeySync('hmac', { length: 32 }).export().toString('hex');
  return buffer;
}

// Criar token para um usuário
export function createTokenForUser(userId: number, username: string): string {
  // Gerar token aleatório
  const rawToken = generateToken();
  
  // Assinar o token com o segredo usando HMAC
  const hmac = createHmac('sha256', TOKEN_SECRET);
  hmac.update(`${userId}:${rawToken}`);
  const signature = hmac.digest('hex');
  
  // Token final: <random>.<signature>
  const token = `${rawToken}.${signature}`;
  
  // Calcular data de expiração
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_EXPIRATION);
  
  // Armazenar token no cache
  tokenCache[token] = {
    userId,
    username,
    token,
    createdAt: now,
    expiresAt
  };
  
  console.log(`📱 Token criado para usuário ${username} (ID: ${userId}). Expira em ${expiresAt.toISOString()}`);
  
  return token;
}

// Verificar se o token é válido
export async function validateToken(token: string): Promise<{ userId: number; username: string } | null> {
  // Verificar se o token existe no cache
  if (token in tokenCache) {
    const entry = tokenCache[token];
    
    // Verificar se o token expirou
    if (entry.expiresAt.getTime() > Date.now()) {
      // Buscar o usuário no banco de dados para garantir que ainda existe
      const user = await storage.getUser(entry.userId);
      
      if (user) {
        console.log(`📱 Token válido para usuário ${entry.username} (ID: ${entry.userId})`);
        return { userId: entry.userId, username: entry.username };
      } else {
        console.log(`📱 Token inválido - usuário não encontrado: ${entry.username} (ID: ${entry.userId})`);
        delete tokenCache[token];
      }
    } else {
      console.log(`📱 Token expirado para usuário ${entry.username} (ID: ${entry.userId})`);
      delete tokenCache[token];
    }
  }
  
  return null;
}

// Middleware para autenticar solicitações com tokens
export async function mobileAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Verificar se é uma solicitação de dispositivo móvel (por query params ou user-agent)
  const isMobileRequest = 
    req.query._t || 
    req.query._ || 
    (req.headers['user-agent'] && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(req.headers['user-agent'] as string));
  
  if (!isMobileRequest) {
    // Se não for uma solicitação móvel, passar para o próximo middleware
    return next();
  }
  
  // Log de início do processamento mobile
  console.log(`📱 Processando solicitação mobile: ${req.method} ${req.url}`);
  
  // Se o usuário já está autenticado pela sessão padrão, passar para o próximo middleware
  if (req.isAuthenticated && req.isAuthenticated()) {
    // Gerar token para o usuário e incluir na resposta para uso futuro
    const token = createTokenForUser((req.user as any).id, (req.user as any).username);
    res.setHeader('X-Mobile-Auth-Token', token);
    
    console.log(`📱 Usuário já autenticado por sessão: ${(req.user as any).username} (ID: ${(req.user as any).id})`);
    console.log(`📱 Token gerado e incluído na resposta`);
    
    return next();
  }
  
  // Verificar se há token no cabeçalho
  const token = req.headers['x-mobile-auth-token'] as string;
  
  if (!token) {
    console.log(`📱 Sem token no cabeçalho - ${req.method} ${req.url}`);
    
    // Se for para rotas que não exigem autenticação ou tenha tratamento especial
    if (req.url.includes('/api/login') || req.url.includes('/api/register')) {
      return next();
    }
    
    // Para as rotas de análise, retornar array vazio em vez de erro 401
    if (req.url.includes('/api/user-analysis-requests') || req.url.includes('/api/all-analysis-requests')) {
      console.log(`📱 Retornando array vazio para rota de análise móvel sem autenticação`);
      return res.status(200).json([]);
    }
    
    return next();
  }
  
  try {
    // Validar o token
    const userInfo = await validateToken(token);
    
    if (userInfo) {
      // Buscar o usuário completo do banco de dados
      const user = await storage.getUser(userInfo.userId);
      
      if (user) {
        // Autenticar o usuário para esta solicitação
        (req as any).user = user;
        (req as any).isAuthenticated = () => true;
        
        // Renovar o token e incluir na resposta
        const newToken = createTokenForUser(userInfo.userId, userInfo.username);
        res.setHeader('X-Mobile-Auth-Token', newToken);
        
        console.log(`📱 Usuário autenticado por token: ${userInfo.username} (ID: ${userInfo.userId})`);
        
        return next();
      }
    }
    
    // Token inválido
    console.log(`📱 Token inválido ou expirado`);
    
    // Para as rotas de análise, retornar array vazio em vez de erro 401
    if (req.url.includes('/api/user-analysis-requests') || req.url.includes('/api/all-analysis-requests')) {
      console.log(`📱 Retornando array vazio para rota de análise com token inválido`);
      return res.status(200).json([]);
    }
    
    // Para outras rotas, continuar sem autenticação
    return next();
  } catch (error) {
    console.error('📱 Erro ao processar token:', error);
    return next();
  }
}

// Middleware para incluir token na resposta após login ou registro bem-sucedido
export function addTokenToResponse(req: Request, res: Response, next: NextFunction) {
  // Interceptar o método json original
  const originalJson = res.json;
  res.json = function(body) {
    // Verificar se é uma resposta de login ou registro bem-sucedida
    const isLoginOrRegister = 
      (req.url === '/api/login' || req.url === '/api/register') && 
      res.statusCode >= 200 && res.statusCode < 300 &&
      body && body.id;
    
    // Verificar se é uma solicitação de dispositivo móvel
    const isMobileRequest = 
      req.query._t || 
      req.query._ || 
      (req.headers['user-agent'] && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(req.headers['user-agent'] as string));
    
    if (isLoginOrRegister && isMobileRequest) {
      // Gerar token para o usuário
      const token = createTokenForUser(body.id, body.username);
      
      // Adicionar o token ao corpo da resposta e ao cabeçalho
      body.mobile_token = token;
      res.setHeader('X-Mobile-Auth-Token', token);
      
      console.log(`📱 Token gerado após login/registro: ${body.username} (ID: ${body.id})`);
    }
    
    return originalJson.call(this, body);
  };
  
  next();
}