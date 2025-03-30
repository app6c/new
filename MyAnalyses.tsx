import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { 
  Loader2, FileText, AlertCircle, CheckCircle, 
  Clock, ArrowUpDown, Eye, Clipboard, CreditCard, Trash2
} from "lucide-react";
import { formatDate, isMobileDevice, mobileApiRequest } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import CheckoutModal from "@/components/EmotionalAnalysis/CheckoutModal";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { AnalysisRequest } from "@shared/schema";

// Interface para incluir o hasResult
interface AnalysisWithResult extends Omit<AnalysisRequest, 'hasResult'> {
  hasResult: boolean;
  resultId?: number;
}

export default function MyAnalyses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [analysisToDelete, setAnalysisToDelete] = useState<number | null>(null);
  
  // Definir o título da página
  useEffect(() => {
    document.title = t('myAnalyses.title');
  }, [t]);
  
  const [checkoutAnalysis, setCheckoutAnalysis] = useState<{
    requestId: string;
    details: {
      id: number;
      priorityArea: string;
      complaint1: string;
    };
  } | null>(null);

  // Detectar se é um dispositivo móvel - log fora para diagnóstico
  const isMobile = isMobileDevice();
  console.log(`📱 Detecção de dispositivo mobile: ${isMobile ? "SIM" : "NÃO"}`);

  // Solução de emergência - forçar URL completa para análises em vez de path relativo
  const baseUrl = window.location.origin;
  const analysisApiUrl = `${baseUrl}/api/user-analysis-requests?_=${Date.now()}`;
  console.log(`📝 URL completa para API: ${analysisApiUrl}`);

  // Usar estados locais para forçar recarregamento
  const [forceRefresh, setForceRefresh] = useState(0);
  
  // Log do cookie de sessão (apenas o fato dele existir, não o valor)
  console.log(`🍪 Cookie de sessão existe: ${document.cookie.includes('method6.sid')}`);
  
  const {
    data: analyses,
    isLoading,
    error,
  } = useQuery<AnalysisWithResult[]>({
    queryKey: ["/api/user-analysis-requests", forceRefresh],
    queryFn: async () => {
      try {
        console.log("🔄 Iniciando requisição para análises, tentativa:", forceRefresh + 1);
        
        // Verificar se o usuário está autenticado antes de fazer a requisição
        if (!user) {
          console.log("⚠️ Usuário não está autenticado, abortando requisição");
          return [];
        }

        // Abordagem direta - primeiro tentar requisição crua com todas as opções de cache desativadas
        try {
          console.log("🔍 Tentando requisição direta com URL completa:", analysisApiUrl);
          
          const response = await fetch(analysisApiUrl, {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          console.log(`📊 Status da resposta direta: ${response.status}`);
          
          if (response.ok) {
            try {
              const responseText = await response.text();
              console.log(`📄 Tamanho da resposta: ${responseText.length} caracteres`);
              
              if (!responseText || responseText.trim() === '') {
                console.log("⚠️ Resposta vazia");
                return [];
              }
              
              try {
                const data = JSON.parse(responseText);
                console.log(`✅ Dados obtidos com sucesso: ${Array.isArray(data) ? data.length : 'não é array'} itens`);
                
                if (Array.isArray(data) && data.length > 0) {
                  console.log(`📋 Primeira análise: ${JSON.stringify(data[0])}`);
                }
                
                return Array.isArray(data) ? data : [];
              } catch (parseError) {
                console.error("❌ Erro ao parsear JSON:", parseError);
                console.log("📜 Texto recebido:", responseText.substring(0, 200) + "...");
                return [];
              }
            } catch (textError) {
              console.error("❌ Erro ao ler texto da resposta:", textError);
              return [];
            }
          } else if (response.status === 401) {
            console.warn("🔒 Erro 401 - Não autorizado");
            // Tentar login novamente - apenas log para diagnóstico
            console.log("👤 Usuário atual:", user?.username);
            return [];
          } else {
            console.error(`❌ Erro HTTP: ${response.status}`);
            try {
              const errorText = await response.text();
              console.error("📜 Detalhes do erro:", errorText);
            } catch (e) {
              console.error("❌ Não foi possível ler detalhes do erro");
            }
            return [];
          }
        } catch (directError) {
          console.error("❌ Falha na requisição direta:", directError);
          
          // Fallback - última chance - usar o mobileApiRequest
          if (isMobile) {
            console.log("📱 Tentativa final usando mobileApiRequest");
            try {
              const mobileResult = await mobileApiRequest("/api/user-analysis-requests");
              return mobileResult;
            } catch (mobileError) {
              console.error("📱 Falha no mobileApiRequest:", mobileError);
              return [];
            }
          }
          
          return [];
        }
      } catch (err) {
        console.error("❌ Erro global na função de consulta:", err);
        return [];
      }
    },
    enabled: true, // Sempre habilitado
    retry: 3, // Tentar 3 vezes
    staleTime: 0, // Nunca considerar fresco
  });
  
  // Mutação para excluir uma análise
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        // A apiRequest já retorna o JSON diretamente quando possível
        return await apiRequest("DELETE", `/api/analysis-requests/${id}`);
      } catch (err) {
        console.error("Erro ao excluir análise:", err);
        throw new Error("Erro ao excluir análise");
      }
    },
    onSuccess: () => {
      toast({
        title: "Análise cancelada com sucesso",
        description: "A análise será excluída permanentemente em 30 dias",
        variant: "default",
      });
      
      // Invalidar o cache para recarregar as análises
      queryClient.invalidateQueries({ queryKey: ["/api/user-analysis-requests"] });
      
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

  // Função para retornar o status traduzido e com estilo
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "aguardando_pagamento":
        return {
          label: t('analysis.status.waitingPayment'),
          color: "bg-yellow-500",
          icon: <Clock className="h-4 w-4" />,
        };
      case "aguardando_analise":
        return {
          label: t('analysis.status.waitingAnalysis'),
          color: "bg-blue-500",
          icon: <Clock className="h-4 w-4" />,
        };
      case "em_analise":
        return {
          label: t('analysis.status.inAnalysis'),
          color: "bg-purple-500",
          icon: <Clipboard className="h-4 w-4" />,
        };
      case "concluido":
        return {
          label: t('analysis.status.completed'),
          color: "bg-green-500",
          icon: <CheckCircle className="h-4 w-4" />,
        };
      case "cancelado":
        return {
          label: t('analysis.status.cancelled'),
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
        return t('analysis.priorityAreas.health');
      case "relationships":
        return t('analysis.priorityAreas.relationships');
      case "professional":
        return t('analysis.priorityAreas.professional');
      case "personal":
        return t('analysis.priorityAreas.personal');
      default:
        return area;
    }
  };

  // Filtrar análises por status e ordenar por ID (decrescente)
  // Adicionar mais logs para debug
  console.log("Dados recebidos analyses:", analyses);
  
  const filteredAnalyses = Array.isArray(analyses) 
    ? analyses
        .filter((analysis) => {
          return statusFilter === "all" || analysis.status === statusFilter;
        })
        .sort((a, b) => b.id - a.id) // Ordenação decrescente por ID
    : [];
    
  console.log("Análises filtradas:", filteredAnalyses.length);

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

  return (
    <div className="container py-8">
      {/* Modal de Checkout */}
      {checkoutAnalysis && (
        <CheckoutModal
          open={!!checkoutAnalysis}
          onOpenChange={(open) => !open && setCheckoutAnalysis(null)}
          requestId={checkoutAnalysis.requestId}
          analysisDetails={checkoutAnalysis.details}
        />
      )}
      
      {/* Diálogo de confirmação para excluir análise */}
      <AlertDialog open={!!analysisToDelete} onOpenChange={(open) => !open && setAnalysisToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('analysis.actions.deleteConfirmation')}</AlertDialogTitle>
            <AlertDialogDescription dangerouslySetInnerHTML={{ 
              __html: t('analysis.actions.deleteQuestion') + 
                '<br /><br />' + 
                t('analysis.actions.deleteWarning')
            }} />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('analysis.actions.deleting')}
                </>
              ) : (
                t('analysis.actions.confirmDelete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('myAnalyses.title')}</h1>
          <p className="text-muted-foreground">
            {t('myAnalyses.subtitle')}
          </p>
        </div>
        <Button asChild>
          <Link href="/nova-analise">{t('myAnalyses.newAnalysisButton')}</Link>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('analysis.actions.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('analysis.status.allStatus')}</SelectItem>
              <SelectItem value="aguardando_pagamento">{t('analysis.status.waitingPayment')}</SelectItem>
              <SelectItem value="aguardando_analise">{t('analysis.status.waitingAnalysis')}</SelectItem>
              <SelectItem value="em_analise">{t('analysis.status.inAnalysis')}</SelectItem>
              <SelectItem value="concluido">{t('analysis.status.completed')}</SelectItem>
              <SelectItem value="cancelado">{t('analysis.status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Espaço para cabeçalho da tabela */}
      <div className="mb-4"></div>

      {/* Tabela de análises */}
      {!filteredAnalyses || filteredAnalyses.length === 0 ? (
        <div className="text-center py-12 px-4 border rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('myAnalyses.noAnalysesFound')}</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {t('myAnalyses.noAnalysesDescription')}
            <br/><br/>
            <span className="text-blue-500">
              {t('myAnalyses.requestNewAnalysis')}
            </span>
          </p>
          <Button asChild>
            <Link href="/nova-analise">{t('myAnalyses.requestButton')}</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">{t('analysis.actions.id')}</TableHead>
                <TableHead className="w-[100px]">{t('analysis.actions.date')}</TableHead>
                <TableHead>{t('analysis.actions.status')}</TableHead>
                <TableHead>{t('analysis.actions.priorityArea')}</TableHead>
                <TableHead>{t('analysis.actions.mainComplaint')}</TableHead>
                <TableHead className="text-right">{t('analysis.actions.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnalyses.map((analysis) => {
                const statusInfo = getStatusInfo(analysis.status);
                
                return (
                  <TableRow key={analysis.id}>
                    <TableCell>#{analysis.id}</TableCell>
                    <TableCell>{formatDate(analysis.createdAt)}</TableCell>
                    <TableCell>
                      <Badge className={`${statusInfo.color} rounded-md flex w-fit items-center gap-1`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{getPriorityArea(analysis.priorityArea)}</TableCell>
                    <TableCell>{analysis.complaint1}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* Botão para pagamento - mostrar apenas se aguardando pagamento e o usuário NÃO for admin */}
                        {analysis.status === "aguardando_pagamento" && user?.role !== "admin" && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            title={t('analysis.payment.payNow')} 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => setCheckoutAnalysis({
                              requestId: analysis.requestId,
                              details: {
                                id: analysis.id,
                                priorityArea: analysis.priorityArea,
                                complaint1: analysis.complaint1,
                              }
                            })}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            {t('analysis.actions.pay')}
                          </Button>
                        )}

                        {/* Botão para visualizar resultado - mostrar para análises concluídas */}
                        {analysis.status === "concluido" && (
                          <Button variant="default" size="sm" asChild title={t('analysis.actions.viewResult')}>
                            <Link href={`/analysis/result/${analysis.requestId}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              {t('analysis.actions.viewResult')}
                            </Link>
                          </Button>
                        )}
                        
                        {/* Botão para excluir análise - não mostrar se já está cancelada */}
                        {analysis.status !== "cancelado" && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            title={t('analysis.actions.delete')}
                            onClick={() => setAnalysisToDelete(analysis.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t('analysis.actions.delete')}
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