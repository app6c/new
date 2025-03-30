import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Função para limpar caches específicos ou todos
export function clearCaches(queryKeys?: string[] | string) {
  if (!queryKeys) {
    // Limpar todos os caches
    queryClient.clear();
    return;
  }
  
  if (typeof queryKeys === 'string') {
    queryClient.invalidateQueries({ queryKey: [queryKeys] });
  } else {
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: RequestInit
): Promise<any> {
  // Adicionar headers de no-cache para garantir dados atualizados
  const headers: Record<string, string> = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  };
  
  // Adicionar Content-Type se tiver dados
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    cache: "no-store",
    ...options
  });

  if (res.status !== 401) {
    await throwIfResNotOk(res);
  }
  
  // Para GET, retornar o JSON; para outros métodos, retornar a resposta
  if (method.toUpperCase() === 'GET') {
    // Apenas tenta fazer parse se o Content-Type é JSON e se o corpo não está vazio
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Atualiza quando o usuário volta para a janela
      refetchOnMount: true, // Atualiza quando o componente é montado
      refetchOnReconnect: true, // Atualiza quando reconecta
      staleTime: 30 * 1000, // 30 segundos antes de considerar os dados desatualizados
      retry: 3, // Tentar novamente até 3 vezes em caso de falha
      retryDelay: attempt => Math.min(1000 * Math.pow(2, attempt), 30000), // Backoff exponencial
      gcTime: 10 * 60 * 1000, // 10 minutos - remove do cache após 10 minutos de inatividade
    },
    mutations: {
      retry: 1, // Tentar novamente 1 vez em caso de falha
    },
  },
});
