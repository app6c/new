import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User, InsertUser } from "@shared/schema";
import { pool } from "./db";
import crypto from "crypto";
import { promisify } from "util";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

// Configura o PostgreSQL como armazenamento de sessão
const PostgresSessionStore = connectPg(session);
const sessionStore = new PostgresSessionStore({
  pool,
  createTableIfMissing: true
});

// Funções para hash e comparação de senhas
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return await bcrypt.compare(supplied, stored);
}

// Middleware para verificar se o usuário está autenticado
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Verificar se é uma requisição de dispositivo móvel
  const isMobileRequest = req.query._t || req.query._ || 
    (req.headers['user-agent'] && 
     /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(req.headers['user-agent'] as string));
  
  // Log detalhado para depuração
  console.log(`Verificando autenticação para ${req.method} ${req.url}`);
  console.log(`  Mobile: ${isMobileRequest ? 'SIM' : 'NÃO'}`);
  console.log(`  isAuthenticated: ${req.isAuthenticated()}`);
  console.log(`  Sessão ID: ${req.session.id}`);
  console.log(`  Cookie: ${JSON.stringify(req.headers.cookie)}`);
  console.log(`  User-Agent: ${req.headers['user-agent']}`);
  
  if (req.isAuthenticated()) {
    // Log do usuário autenticado
    console.log(`  ✅ Usuário autenticado: ${(req.user as any).id} (${(req.user as any).username})`);
    return next();
  }
  
  console.log(`  ⚠️ Acesso não autorizado para ${req.method} ${req.url}`);
  
  // Para dispositivos móveis em rotas específicas, retornar array vazio em vez de erro 401
  if (isMobileRequest && 
      (req.url.includes('/api/user-analysis-requests') || 
       req.url.includes('/api/all-analysis-requests'))) {
    console.log(`  📱 Retornando array vazio para dispositivo móvel em ${req.url}`);
    return res.status(200).json([]);
  }
  
  return res.status(401).json({ 
    message: "Não autorizado",
    detail: "Sua sessão pode ter expirado. Por favor, faça login novamente."
  });
}

// Middleware para verificar se o usuário é administrador
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.username === "analista") {
    return next();
  }
  return res.status(403).json({ message: "Acesso proibido" });
}

export function setupAuth(app: Express) {
  // Configuração de sessão com melhorias para estabilidade
  console.log("Configurando sessões...");
  
  const sessionSecret = process.env.SESSION_SECRET || "sua_chave_secreta_temporaria";
  console.log(`Usando SESSION_SECRET ${sessionSecret.length > 0 ? '(configurado)' : '(padrão)'}`);
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: true, // Mudado para true para evitar problemas de expiração
    saveUninitialized: true, // Mudado para true para garantir criação da sessão
    store: sessionStore,
    cookie: { 
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias - aumentado para reduzir expiração
      secure: process.env.NODE_ENV === "production", // Usar HTTPS em produção
      sameSite: "lax" // Alterado para 'lax' para melhor compatibilidade entre origens
    },
    name: "method6.sid" // Nome personalizado para o cookie de sessão
  };

  // Inicialização de session e passport
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configuração da estratégia de autenticação local
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async (username, password, done) => {
        try {
          const user = await storage.getUserByUsername(username);

          if (!user) {
            return done(null, false, { message: "Usuário não cadastrado" });
          }

          // Remove status check since we don't have this column
          // if (user.status !== "active") {
          //   return done(null, false, { message: "Usuário inativo ou suspenso" });
          // }

          const isPasswordValid = await comparePasswords(password, user.password);
          if (!isPasswordValid) {
            return done(null, false, { message: "Senha incorreta" });
          }

          // Remove last login update since we don't have this column
          // await storage.updateLastLogin(user.id);

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialização e deserialização de usuário
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        console.error(`❌ Falha na deserialização: usuário ID ${id} não encontrado.`);
        return done(null, false);
      }
      console.log(`✅ Usuário deserializado com sucesso: ID ${id}, username: ${user.username}`);
      return done(null, user);
    } catch (error) {
      console.error(`❌ Erro na deserialização: ${error}`);
      return done(error, null);
    }
  });

  // Rotas de autenticação
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      // Verificar se username já existe
      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Nome de usuário já cadastrado" });
      }

      // Hash na senha
      const hashedPassword = await hashPassword(req.body.password);

      // Criar o usuário
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword
      });

      // Fazer login automático
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Erro ao fazer login" });
        }
        return res.status(201).json({ 
          id: user.id,
          username: user.username
        });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error, user: User | false, info: { message: string }) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Erro ao fazer login" });
        }
        return res.status(200).json({ 
          id: user.id,
          username: user.username || 'analista'
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.status(200).json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get("/api/me", (req: Request, res: Response) => {
    // Verificar se é uma requisição de dispositivo móvel 
    const isMobileRequest = req.query._t || req.query._ || 
      (req.headers['user-agent'] && 
       /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(req.headers['user-agent'] as string));
    
    // Log para depuração mobile
    if (isMobileRequest) {
      console.log('Verificação mobile para /api/me');
      console.log('Headers:', req.headers);
      console.log('Session:', req.session.id);
    }
    
    if (!req.isAuthenticated()) {
      if (isMobileRequest) {
        console.log('Usuário não autenticado (401)');
      }
      return res.status(401).json({ message: "Usuário não autenticado" });
    }
    
    const user = req.user;
    // Retornar todos os campos disponíveis do usuário
    res.status(200).json(user);
  });

  // Rota para verificar se o usuário atual é administrador
  app.get("/api/check-admin", isAuthenticated, (req: Request, res: Response) => {
    res.status(200).json({ isAdmin: req.user.username === "analista" });
  });

  // Tabela temporária em memória para armazenar tokens de redefinição de senha
  // Em produção, isso deveria ser armazenado no banco de dados
  const passwordResetTokens: Record<string, { userId: number, email: string, token: string, expires: Date }> = {};

  // Rota para solicitar redefinição de senha
  app.post("/api/forgot-password", async (req: Request, res: Response) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "E-mail é obrigatório" });
    }
    
    try {
      // Buscar usuário pelo email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Por segurança, não informamos se o email existe ou não
        return res.status(200).json({ 
          message: "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha."
        });
      }
      
      // Gerar token único
      const resetToken = crypto.randomBytes(20).toString('hex');
      
      // Em produção, esse token seria armazenado no banco de dados
      passwordResetTokens[resetToken] = {
        userId: user.id,
        email: user.email,
        token: resetToken,
        expires: new Date(Date.now() + 3600000) // 1 hora de validade
      };
      
      // Criar URL para redefinição
      const resetUrl = `${req.protocol}://${req.get('host')}/auth?tab=reset&token=${resetToken}`;
      
      // Em produção, enviaríamos um email com o link
      console.log(`URL de redefinição de senha para ${user.username}: ${resetUrl}`);
      
      // Retornar mensagem de sucesso (independente do email existir ou não)
      res.status(200).json({
        message: "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.",
        // No ambiente de desenvolvimento, retornamos o token para testes
        // Em produção, esse token NÃO deve ser retornado na resposta
        devToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
        devUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined,
      });
      
    } catch (error: any) {
      console.error("Erro ao processar solicitação de redefinição de senha:", error);
      res.status(500).json({ message: "Erro ao processar solicitação" });
    }
  });
  
  // Rota para validar o token de redefinição
  app.get("/api/reset-password/:token", (req: Request, res: Response) => {
    const { token } = req.params;
    
    const resetData = passwordResetTokens[token];
    
    if (!resetData || resetData.expires < new Date()) {
      return res.status(400).json({ 
        message: "Token de redefinição inválido ou expirado" 
      });
    }
    
    // Token válido
    res.status(200).json({ 
      message: "Token válido",
      email: resetData.email
    });
  });
  
  // Rota para redefinir a senha
  app.post("/api/reset-password/:token", async (req: Request, res: Response) => {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: "Nova senha é obrigatória" });
    }
    
    const resetData = passwordResetTokens[token];
    
    if (!resetData || resetData.expires < new Date()) {
      return res.status(400).json({ 
        message: "Token de redefinição inválido ou expirado" 
      });
    }
    
    try {
      // Hash da nova senha
      const hashedPassword = await hashPassword(password);
      
      // Atualizar senha do usuário
      await storage.updateUserPassword(resetData.userId, hashedPassword);
      
      // Remover token usado
      delete passwordResetTokens[token];
      
      res.status(200).json({ 
        message: "Senha redefinida com sucesso. Você já pode fazer login com sua nova senha." 
      });
      
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      res.status(500).json({ message: "Erro ao redefinir senha" });
    }
  });
}