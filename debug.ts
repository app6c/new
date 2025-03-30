import { Request, Response, Express, NextFunction } from "express";

export function setupDebugRoutes(app: Express) {
  app.get("/api/debug/session-info", (req: Request, res: Response) => {
    try {
      // Verificar se há sessão
      const sessionData = {
        id: req.sessionID || null,
        authenticated: req.isAuthenticated?.() || false,
        user: req.user ? {
          id: (req.user as any).id,
          username: (req.user as any).username,
        } : null,
        session: req.session ? {
          cookie: req.session.cookie,
          // Outras informações seguras da sessão
        } : null,
        cookies: req.headers.cookie ? req.headers.cookie.split(';').map(c => c.trim().split('=')[0]) : [],
        headers: {
          userAgent: req.headers['user-agent'],
          accept: req.headers.accept,
          connection: req.headers.connection,
          host: req.headers.host,
          referer: req.headers.referer,
          // Não incluir informações sensíveis
        }
      };
      
      res.json({
        success: true,
        data: sessionData
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? null : error.stack
        }
      });
    }
  });

  // Rota para testar comunicação básica API-cliente
  app.get("/api/debug/ping", (req: Request, res: Response) => {
    res.json({ 
      pong: true, 
      timestamp: Date.now(),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      session: !!req.session,
      authenticated: req.isAuthenticated?.() || false
    });
  });

  // Endpoint para verificar cookies armazenados no cliente
  app.get("/api/debug/cookies", (req: Request, res: Response) => {
    const cookieHeader = req.headers.cookie;
    res.json({
      rawHeader: cookieHeader,
      parsedCookies: cookieHeader ? 
        cookieHeader.split(';')
          .map(cookie => cookie.trim().split('=')[0])
          .filter(Boolean) : 
        []
    });
  });

  // Endpoint para testar permissões de diferentes status de usuário
  app.get("/api/debug/auth-test", (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      // Para dispositivos móveis, retornar informação útil em vez de erro
      if (req.headers['user-agent']?.includes('Mobile')) {
        return res.json({
          status: "unauthenticated",
          info: "Não autenticado. Você deve fazer login primeiro.",
          isMobile: true,
          timestamp: Date.now()
        });
      }
      
      return res.status(401).json({ 
        status: "error",
        message: "Não autenticado" 
      });
    }
    
    res.json({
      status: "authenticated",
      user: {
        id: (req.user as any).id,
        username: (req.user as any).username,
        isAdmin: (req.user as any).username === "analista"
      },
      session: {
        id: req.sessionID,
        expires: req.session?.cookie?.expires
      }
    });
  });

  // Endpoint para atualizar sessão do usuário (útil para evitar expiração)
  app.post("/api/debug/refresh-session", (req: Request, res: Response) => {
    if (!req.session) {
      return res.status(500).json({ message: "Sessão não disponível" });
    }
    
    // Atualizamos o cookie para que a sessão seja prolongada
    req.session.touch();
    
    res.json({
      message: "Sessão atualizada com sucesso",
      sessionID: req.sessionID,
      expires: req.session.cookie.expires,
      maxAge: req.session.cookie.maxAge
    });
  });
}