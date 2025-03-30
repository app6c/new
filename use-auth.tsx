import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/me"],
    queryFn: async () => {
      try {
        // apiRequest agora retorna diretamente os dados em JSON
        return await apiRequest("GET", "/api/me");
      } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
        // Se for erro 401, retornar null (usuário não autenticado)
        if (error instanceof Error && error.message.includes("401")) {
          return null;
        }
        // Propagar outros erros
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        const userData = await apiRequest("POST", "/api/login", credentials);
        // Fazer uma chamada extra para garantir que temos os dados mais atualizados
        const refreshedData = await apiRequest("GET", "/api/me");
        return refreshedData;
      } catch (error) {
        console.error("Erro no login:", error);
        throw new Error(error instanceof Error ? error.message : "Falha no login");
      }
    },
    onSuccess: (userData: User) => {
      // Atualizar o cache com os dados mais recentes
      queryClient.setQueryData(["/api/me"], userData);
      // Forçar um recarregamento dos dados do usuário
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo(a) de volta, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      try {
        // apiRequest agora retorna diretamente o JSON
        return await apiRequest("POST", "/api/register", userData);
      } catch (error) {
        console.error("Erro no registro:", error);
        throw new Error(error instanceof Error ? error.message : "Falha no registro");
      }
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/me"], userData);
      toast({
        title: "Registro realizado com sucesso",
        description: "Sua conta foi criada e você já está logado!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        // apiRequest agora retorna diretamente o JSON (ou void neste caso)
        await apiRequest("POST", "/api/logout");
      } catch (error) {
        console.error("Erro no logout:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/me"], null);
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado da sua conta.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}