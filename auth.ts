import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User, InsertUser } from "@shared/schema";
import { pool } from "./db";

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
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Não autorizado" });
}

// Middleware para verificar se o usuário é administrador
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.username === "analista") {
    return next();
  }
  return res.status(403).json({ message: "Acesso proibido" });
}

export function setupAuth(app: Express) {
  // Configuração de sessão
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "sua_chave_secreta_temporaria", // Usar variável de ambiente em produção
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { 
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      secure: process.env.NODE_ENV === "production", // Usar HTTPS em produção
      sameSite: "lax"
    }
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
      done(null, user);
    } catch (error) {
      done(error, null);
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

  app.get("/api/me", isAuthenticated, (req: Request, res: Response) => {
    const user = req.user;
    res.status(200).json({ 
      id: user.id,
      username: user.username
    });
  });

  // Rota para verificar se o usuário atual é administrador
  app.get("/api/check-admin", isAuthenticated, (req: Request, res: Response) => {
    res.status(200).json({ isAdmin: req.user.username === "analista" });
  });
}