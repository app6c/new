import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, AlertCircle, CheckCircle, Clock, ArrowUpDown, Eye, Pencil, BarChart, Play, Trash2 } from "lucide-react";
import { formatDate, isMobileDevice, mobileApiRequest } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AnalysisRequest } from "@shared/schema";

// Interface para análises com as informações necessárias
interface AnalysisWithDetails extends Omit<AnalysisRequest, 'hasResult'> {
  hasResult: boolean;
  hasScoring?: boolean;
  userName?: string; // Nome do usuário que criou a análise
}

export default function AdminAnalyses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [userIdFilter, setUserIdFilter] = useState<number | null>(null);
  const [analysisToDelete, setAnalysisToDelete] = useState<number | null>(null);
  
  // Ler parâmetros da URL
  const location = useLocation();
  const params = new URLSearchParams(window.location.search);
  const userIdParam = params.get('userId');
  
  // Se houver userId na URL, definir o filtro
  useEffect(() => {
    if (userIdParam) {
      const userId = parseInt(userIdParam);
      if (!isNaN(userId)) {
        setUserIdFilter(userId);
      }
    }
  }, [userIdParam]);
  
  // Mutação para excluir uma análise
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/analysis-requests/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao excluir análise");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Análise cancelada com sucesso",
        description: "A análise será excluída permanentemente em 30 dias",
        variant: "default",
      });
      
      // Invalidar o cache para recarregar as análises
      queryClient.invalidateQueries({ queryKey: ["/api/all-analysis-requests"] });
      
      // Limpar o ID da análise a ser excluída
      setAnalysisToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir análise",
        description: error.message,
        variant: "destructive",
      });
      setAnalysisToDelete(null);
    }
  });
  
  // Função para confirmar a exclusão de uma análise
  const handleDeleteConfirm = () => {
    if (analysisToDelete) {
      deleteMutation.mutate(analysisToDelete);
    }
  };
  
  // Mutação para aprovar pagamento manualmente
  const approvePaymentMutation = useMutation({
    mutationFn: async (analysisId: number) => {
      const res = await apiRequest("PATCH", `/api/analysis-requests/${analysisId}/approve-payment`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Falha ao aprovar pagamento");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Pagamento aprovado",
        description: "O pagamento foi aprovado manualmente com sucesso. A análise agora está pronta para ser iniciada.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/all-analysis-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao aprovar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para iniciar a análise
  const startAnalysisMutation = useMutation({
    mutationFn: async (analysisId: number) => {
      const res = await apiRequest("PATCH", `/api/analysis-requests/${analysisId}/start-analysis`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Falha ao iniciar análise");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Análise iniciada",
        description: "A análise foi iniciada com sucesso. Você pode iniciar a pontuação corporal agora.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/all-analysis-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao iniciar análise",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const {
    data: analyses,
    isLoading,
    error,
  } = useQuery<AnalysisWithDetails[]>({
    queryKey: ["/api/all-analysis-requests"],
    queryFn: async () => {
      try {
        // Verificar se o usuário está autenticado
        if (!user || user.username !== "analista") {
          console.log("Usuário não autenticado como analista, abortando requisição");
          return [];
        }
        
        console.log("Iniciando requisição para API de análises (admin)");
        
        // Verificar se é um dispositivo móvel
        if (isMobileDevice()) {
          console.log("📱 Detectado dispositivo móvel para admin, usando mobileApiRequest");
          // Usar a função específica para mobile
          const mobileResult = await mobileApiRequest("/api/all-analysis-requests");
          console.log("📱 Dados mobile admin obtidos:", mobileResult ? mobileResult.length : 0);
          
          if (Array.isArray(mobileResult) && mobileResult.length > 0) {
            // Simplificar para dispositivos móveis - não fazer verificações adicionais
            return mobileResult.map(analysis => ({
              ...analysis,
              hasResult: analysis.hasResult || false,
              hasScoring: false // Simplificar para mobile
            }));
          }
        }
        
        try {
          // Tentar com apiRequest primeiro
          const analysisData = await apiRequest("GET", "/api/all-analysis-requests");
          console.log("Dados de análises admin obtidos com sucesso:", analysisData ? analysisData.length : 0);
          
          if (Array.isArray(analysisData)) {
            console.log("Tipos de análises admin recebidas:", analysisData.map(a => typeof a));
            console.log("Primeira análise admin:", analysisData.length > 0 ? JSON.stringify(analysisData[0]) : "nenhuma");
          } else {
            console.log("Resultado admin não é um array:", typeof analysisData);
            return [];
          }
          
          // Para cada análise, verificar se tem resultado e pontuação
          const analysesWithDetails = await Promise.all(
            analysisData.map(async (analysis: AnalysisRequest) => {
              try {
                // Verificar se há resultado de análise
                const resultRes = await apiRequest("GET", `/api/analysis-results/${analysis.id}`);
                const hasResult = !!resultRes;
                
                // Verificar se há tabela de pontuação
                const scoringRes = await apiRequest("GET", `/api/body-scoring-tables/request/${analysis.id}`);
                const hasScoring = !!scoringRes;
                
                return {
                  ...analysis,
                  hasResult,
                  hasScoring
                };
              } catch (error) {
                // Se ocorrer um erro, significa que não há resultado ou pontuação
                // Retornamos a análise sem os flags
                console.log(`Erro ao buscar detalhes para análise ID ${analysis.id}:`, error);
                return {
                  ...analysis,
                  hasResult: false,
                  hasScoring: false
                };
              }
            })
          );
          
          return analysesWithDetails;
        } catch (fetchErr) {
          console.error("Erro na requisição para API de análises (admin):", fetchErr);
          
          // Tentar fazer requisição direta como fallback
          console.log("Tentando fazer requisição direta como fallback (admin)");
          const directResult = await fetch("/api/all-analysis-requests", {
            credentials: "include",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache",
              "Expires": "0"
            }
          });
          
          if (directResult.ok) {
            const data = await directResult.json();
            console.log("Dados obtidos via fallback (admin):", data ? data.length : 0);
            
            // Não vamos fazer as requisições adicionais para verificar resultado e pontuação
            // para manter a simplicidade do fallback
            return data || [];
          } else {
            console.error("Requisição fallback também falhou (admin):", directResult.status);
            return [];
          }
        }
      } catch (error) {
        console.error("Erro ao buscar análises (admin):", error);
        return [];
      }
    },
    enabled: true, // Sempre habilitado, verificação interna
    retry: 3, // Tentar três vezes
    staleTime: 0, // Sempre considerado desatualizado
  });

  // Função para retornar o status traduzido e com estilo
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "aguardando_pagamento":
        return {
          label: "Aguardando Pagamento",
          color: "bg-yellow-500",
          icon: <Clock className="h-4 w-4" />,
        };
      case "aguardando_analise":
        return {
          label: "Aguardando Análise",
          color: "bg-blue-500",
          icon: <Clock className="h-4 w-4" />,
        };
      case "em_analise":
        return {
          label: "Em Análise",
          color: "bg-purple-500",
          icon: <Pencil className="h-4 w-4" />,
        };
      case "concluido":
        return {
          label: "Concluído",
          color: "bg-green-500",
          icon: <CheckCircle className="h-4 w-4" />,
        };
      case "cancelado":
        return {
          label: "Cancelado",
          color: "bg-red-500",
          icon: <AlertCircle className="h-4 w-4" />,
        };
      default:
        return {
          label: status,
          color: "bg-gray-500",
          icon: null,
        };
    }
  };

  // Função para traduzir a área prioritária
  const getPriorityArea = (area: string) => {
    switch (area) {
      case "health":
        return "Saúde";
      case "relationships":
        return "Relacionamentos";
      case "professional":
        return "Profissional";
      default:
        return area;
    }
  };

  // Filtrar análises por status e termo de busca, e ordenar por ID (decrescente)
  const filteredAnalyses = analyses
    ?.filter((analysis) => {
      // Filtro por status
      const matchesStatus = statusFilter === "all" || analysis.status === statusFilter;
      
      // Filtro por termo de busca
      const matchesSearch = 
        searchTerm === "" || 
        analysis.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (analysis.complaint1 && analysis.complaint1.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filtro por ID de usuário (se estiver definido)
      const matchesUserId = userIdFilter === null || analysis.userId === userIdFilter;
      
      return matchesStatus && matchesSearch && matchesUserId;
    })
    .sort((a, b) => b.id - a.id); // Ordenação decrescente por ID

  if (isLoading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="bg-destructive/10 p-4 rounded-lg text-destructive flex items-center gap-2 mb-8">
          <AlertCircle className="h-5 w-5" />
          <span>Erro ao carregar análises: {(error as Error).message}</span>
        </div>
        <Button asChild>
          <Link href="/">Voltar para o Início</Link>
        </Button>
      </div>
    );
  }

  // Verificar se o usuário é um analista
  if (user?.username !== "analista") {
    return (
      <div className="container py-8">
        <div className="bg-destructive/10 p-4 rounded-lg text-destructive flex items-center gap-2 mb-8">
          <AlertCircle className="h-5 w-5" />
          <span>Acesso negado: Você não tem permissão para acessar esta página.</span>
        </div>
        <Button asChild>
          <Link href="/">Voltar para o Início</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Diálogo de confirmação para excluir análise */}
      <AlertDialog open={!!analysisToDelete} onOpenChange={(open) => !open && setAnalysisToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta análise? Esta ação não pode ser desfeita.
              <br /><br />
              A análise será marcada como <strong>cancelada</strong> e será excluída permanentemente após 30 dias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Sim, excluir análise"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Análises</h1>
          <p className="text-muted-foreground">
            Visualize, analise e gerencie todas as solicitações de análise emocional
          </p>
          
          {/* Indicador de filtro de usuário */}
          {userIdFilter && (
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-blue-500">Filtrado por Usuário ID: {userIdFilter}</Badge>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 px-2" 
                onClick={() => {
                  setUserIdFilter(null);
                  window.history.pushState({}, '', '/admin/analyses');
                }}
              >
                Limpar Filtro
              </Button>
            </div>
          )}
        </div>
        
        {/* Botão para voltar à lista de usuários */}
        {userIdFilter && (
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link href="/admin/users">
              Voltar para Lista de Usuários
            </Link>
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/3">
          <Input
            placeholder="Buscar por ID ou conteúdo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-full md:w-1/4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="aguardando_pagamento">Aguardando Pagamento</SelectItem>
              <SelectItem value="aguardando_analise">Aguardando Análise</SelectItem>
              <SelectItem value="em_analise">Em Análise</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de análises */}
      {!filteredAnalyses || filteredAnalyses.length === 0 ? (
        <div className="text-center py-12 px-4 border rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Nenhuma análise encontrada</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Não foram encontradas análises com os filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Área Prioritária</TableHead>
                <TableHead>Queixa Principal</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnalyses.map((analysis) => {
                const statusInfo = getStatusInfo(analysis.status);
                
                return (
                  <TableRow key={analysis.id}>
                    <TableCell className="font-medium">#{analysis.id}</TableCell>
                    <TableCell className="font-medium">
                      {analysis.userName || "Usuário"}
                    </TableCell>
                    <TableCell>{formatDate(analysis.createdAt)}</TableCell>
                    <TableCell>
                      <Badge className={`${statusInfo.color} rounded-md flex w-fit items-center gap-1`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {analysis.status === "concluido" ? (
                        <Badge className="bg-green-500 rounded-md flex w-fit items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Disponível
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="ml-2 h-6 px-2 py-0" 
                            asChild
                          >
                            <Link href={`/analysis/result/${analysis.requestId}`}>
                              <Eye className="h-3 w-3" />
                            </Link>
                          </Button>
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-500 rounded-md flex w-fit items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getPriorityArea(analysis.priorityArea)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {analysis.complaint1}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">

                        
                        {/* Botão para Aprovar Pagamento */}
                        {analysis.status === "aguardando_pagamento" && (
                          <Button 
                            variant="default" 
                            size="sm"
                            title="Aprovar pagamento manualmente"
                            onClick={() => approvePaymentMutation.mutate(analysis.id)}
                            disabled={approvePaymentMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {approvePaymentMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Aprovar
                          </Button>
                        )}

                        {/* Botão para Iniciar Análise */}
                        {analysis.status === "aguardando_analise" && (
                          <Button 
                            variant="default" 
                            size="sm"
                            title="Iniciar análise"
                            onClick={() => startAnalysisMutation.mutate(analysis.id)}
                            disabled={startAnalysisMutation.isPending}
                          >
                            {startAnalysisMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Play className="h-4 w-4 mr-1" />
                            )}
                            Iniciar
                          </Button>
                        )}

                        {/* Botão para Pontuação Corporal - mostrar sempre */}
                        <Button 
                          variant={analysis.hasScoring ? "outline" : "default"} 
                          size="sm" 
                          asChild 
                          title="Pontuação corporal"
                        >
                          <Link href={`/analysis/scoring/${analysis.id}`}>
                            <BarChart className="h-4 w-4 mr-1" />
                            Pontuação
                          </Link>
                        </Button>

                        {/* Botão para Análise Final */}
                        {analysis.hasScoring && (
                          <Button 
                            variant={analysis.hasResult ? "outline" : "default"} 
                            size="sm" 
                            asChild 
                            title="Análise final (Virada de Chave)"
                          >
                            <Link href={`/analysis/key-turn/${analysis.id}`}>
                              <FileText className="h-4 w-4 mr-1" />
                              Virada
                            </Link>
                          </Button>
                        )}
                        
                        {/* Botão para excluir análise - não mostrar se já está cancelada */}
                        {analysis.status !== "cancelado" && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            title="Excluir análise"
                            onClick={() => setAnalysisToDelete(analysis.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}