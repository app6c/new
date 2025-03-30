import React, { useState, useRef, useCallback, useEffect, Suspense, lazy } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, clearCaches } from '@/lib/queryClient';
// Import de BodyScoringTable removido pois o componente não é mais usado nesta página
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Download, Loader2, Share2, PieChart as PieChartIcon, RefreshCw, Check, X, DollarSign, Heart } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
// Importar com lazy loading os componentes pesados
import { 
  ResponsiveContainer
} from 'recharts';
// Lazy loading para componentes de gráfico
const LazyChart = lazy(() => import('@/components/EmotionalAnalysis/LazyChart'));

// Deixar as bibliotecas de PDF como importações normais para evitar problemas
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Função auxiliar para obter a porcentagem do padrão
const getPatternPercentage = (patternName: string, table: any): number => {
  if (!table) return 0;
  switch(patternName.toLowerCase()) {
    case 'criativo': return table.creativoPercentage;
    case 'conectivo': return table.conectivoPercentage;
    case 'forte': return table.fortePercentage;
    case 'lider': return table.liderPercentage;
    case 'competitivo': return table.competitivoPercentage;
    default: return 0;
  }
};

export default function AnalysisResult() {
  const { requestId } = useParams();
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Mutation para regerar a análise
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!analysisRequest?.id) {
        throw new Error("ID da análise não disponível");
      }
      
      return await apiRequest('POST', `/api/analysis-requests/${analysisRequest.id}/regenerate`);
    },
    onSuccess: () => {
      // Atualizar os estados das consultas
      queryClient.invalidateQueries({ queryKey: [`/api/analysis-requests/${requestId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/analysis-results/${analysisRequest?.id}`] });
      
      toast({
        title: "Solicitação de regeneração enviada",
        description: "Sua análise será processada novamente em breve.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Erro ao solicitar regeneração:", error);
      toast({
        title: "Erro ao solicitar regeneração",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive",
      });
    }
  });
  
  // Buscar dados da solicitação de análise com retry e refetch
  const { data: analysisRequest, isLoading, isError, refetch: refetchRequest } = useQuery({
    queryKey: [`/api/analysis-requests/${requestId}`],
    queryFn: async () => {
      if (!requestId) {
        setError("ID da solicitação não fornecido");
        throw new Error("Request ID is required");
      }
      
      try {
        // A apiRequest já retorna o JSON
        return await apiRequest('GET', `/api/analysis-requests/${requestId}`);
      } catch (err) {
        if (err instanceof Error) {
          setError(`Erro ao carregar solicitação: ${err.message}`);
        } else {
          setError("Erro desconhecido ao carregar solicitação");
        }
        throw err;
      }
    },
    enabled: !!requestId,
    retry: 3, // Tentar 3 vezes antes de falhar
    staleTime: 10 * 1000, // Dados são considerados atualizados por 10 segundos
    refetchOnWindowFocus: true // Recarregar quando o usuário volta para a janela
  });
  
  // Buscar tabela de pontuação corporal com retry
  const { data: bodyScoringTable, isLoading: isLoadingScoring, refetch: refetchScoring } = useQuery({
    queryKey: [`/api/body-scoring-tables/request/${analysisRequest?.id}`],
    queryFn: async () => {
      if (!analysisRequest?.id) return null;
      
      try {
        // A apiRequest já retorna o JSON
        return await apiRequest('GET', `/api/body-scoring-tables/request/${analysisRequest.id}`);
      } catch (err) {
        // Se a tabela não existe, apenas retorna null
        if (err instanceof Error && err.message.includes('404')) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!analysisRequest?.id,
    retry: 3,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true
  });
  
  // Buscar resultados da análise final (Etapa 7 - Virada de Chave)
  const { data: analysisResult, isLoading: isLoadingResult, refetch: refetchResult } = useQuery({
    queryKey: [`/api/analysis-results/${analysisRequest?.id}`],
    queryFn: async () => {
      if (!analysisRequest?.id) return null;
      
      try {
        // A apiRequest já retorna o JSON
        return await apiRequest('GET', `/api/analysis-results/${analysisRequest.id}`);
      } catch (err) {
        // Se o resultado não existe, apenas retorna null
        if (err instanceof Error && err.message.includes('404')) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!analysisRequest?.id,
    retry: 1,
    staleTime: 5 * 1000, // Dados da análise são considerados atualizados por apenas 5 segundos
    refetchOnWindowFocus: true
  });
  
  // Efeito para recarregar dados automaticamente quando necessário
  React.useEffect(() => {
    // Se temos uma solicitação mas não temos resultado (e deveria ter)
    if (analysisRequest?.hasResult === true && !analysisResult) {
      // Criar um intervalo para verificar a cada 3 segundos
      const interval = setInterval(() => {
        refetchResult();
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [analysisRequest, analysisResult, refetchResult]);
  
  // Componente para mostrar o estado de carregamento mais amigável com skeletons
  const LoadingState = useCallback(() => {
    return (
      <div className="container max-w-5xl py-8 mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-2/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full mb-6" />
            
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
              <Skeleton className="h-6 w-1/2 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-6 w-24" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-2.5 w-32" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
            
            <div className="mt-6">
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }, []);
  
  if (isLoading) {
    return <LoadingState />;
  }
  
  if (isError || error) {
    return (
      <div className="container max-w-5xl py-8 mx-auto">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            {error || "Ocorreu um erro ao carregar os resultados da análise."}
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/my-analyses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Minhas Análises
          </Link>
        </Button>
      </div>
    );
  }
  
  // Verificar se a tabela de pontuação existe e tem todos os campos necessários
  const hasScoringTable = !!bodyScoringTable && 
    typeof bodyScoringTable.primaryPattern === 'string' && 
    typeof bodyScoringTable.creativoPercentage === 'number';
  
  // Preparar dados para o gráfico
  const prepareChartData = () => {
    if (!bodyScoringTable) return [];
    
    return [
      { name: 'Criativo', valor: bodyScoringTable.creativoPercentage || 0, color: '#9333ea' },
      { name: 'Conectivo', valor: bodyScoringTable.conectivoPercentage || 0, color: '#2563eb' },
      { name: 'Forte', valor: bodyScoringTable.fortePercentage || 0, color: '#dc2626' },
      { name: 'Líder', valor: bodyScoringTable.liderPercentage || 0, color: '#ca8a04' },
      { name: 'Competitivo', valor: bodyScoringTable.competitivoPercentage || 0, color: '#16a34a' }
    ].sort((a, b) => b.valor - a.valor);
  };
  
  const chartData = prepareChartData();
  
  return (
    <div className="container max-w-5xl py-8 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Link href="/my-analyses">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Minhas Análises
          </Button>
        </Link>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Limpar caches manualmente e recarregar todos os dados
              // Invalidar queries manualmente para garantir dados frescos
              queryClient.invalidateQueries({ queryKey: [`/api/analysis-requests/${requestId}`] });
              if (analysisRequest?.id) {
                queryClient.invalidateQueries({ queryKey: [`/api/body-scoring-tables/request/${analysisRequest.id}`] });
                queryClient.invalidateQueries({ queryKey: [`/api/analysis-results/${analysisRequest.id}`] });
              }
              
              // Recarregar dados
              refetchRequest();
              if (analysisRequest?.id) {
                refetchScoring();
                if (analysisRequest.hasResult) {
                  refetchResult();
                }
              }
              
              toast({
                title: "Atualizando dados",
                description: "Os dados da análise estão sendo limpos e atualizados.",
                variant: "default",
              });
            }}
            className="mr-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-1 text-blue-600" />
            Limpar Cache
          </Button>
          <div className="text-sm text-slate-500">ID: {requestId}</div>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">
            Resultado da Análise Emocional
          </CardTitle>
          <CardDescription>
            Veja os resultados da sua análise corporal e emocional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysisRequest && (
            <>
              {/* Status de Processamento */}
              <div className="mb-6 p-4 border border-blue-100 rounded-lg bg-blue-50">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">Status da Análise: {" "}
                  <span className="font-bold">{
                    analysisRequest.status === "aguardando_pagamento" 
                      ? "Aguardando Pagamento" 
                      : analysisRequest.status === "aguardando_analise" 
                        ? "Aguardando Análise"
                        : analysisRequest.status === "em_analise"
                          ? "Em Análise"
                          : analysisRequest.status === "concluido"
                            ? "Concluída"
                            : "Em Processamento"
                  }</span>
                </h3>
                <div className="flex flex-col space-y-1 mb-4">
                  <p className="text-sm text-blue-600">
                    ID da Análise: <span className="font-semibold">{analysisRequest.id}</span>
                  </p>
                  <p className="text-sm text-blue-600">
                    Usuário: <span className="font-semibold">{user?.username || "Não disponível"}</span>
                  </p>
                  <p className="text-sm text-blue-600">
                    ID do pedido: <span className="font-semibold">{analysisRequest.requestId}</span>
                  </p>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full mb-4">
                  {/* Barra de Progresso baseada no status */}
                  <div className={`h-2 rounded-full bg-blue-600`} style={{
                    width: analysisRequest.status === "aguardando_pagamento" 
                      ? "25%" 
                      : analysisRequest.status === "aguardando_analise" 
                        ? "50%"
                        : analysisRequest.status === "em_analise"
                          ? "75%"
                          : analysisRequest.status === "concluido"
                            ? "100%"
                            : "10%"
                  }}></div>
                </div>
              </div>
            
              {/* Mensagem específica para cada situação */}
              {!hasScoringTable ? (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Análise Corporal Pendente</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>A análise corporal ainda não foi realizada para esta solicitação.</p>
                    <p>Nossa equipe está trabalhando para processar sua análise o mais rápido possível. Caso tenha dúvidas, entre em contato pelo e-mail: <span className="font-semibold">suporte@analiseemocional.com.br</span></p>
                    <div className="mt-4">
                      <h4 className="font-semibold mb-1">Próximos passos:</h4>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Nosso analista avaliará suas fotos</li>
                        <li>Você receberá uma notificação quando sua análise estiver pronta</li>
                        <li>Volte a esta página para ver seus resultados completos</li>
                      </ol>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-green-50 border-green-200 mb-6">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700">Análise Corporal Concluída</AlertTitle>
                  <AlertDescription>
                    Sua análise corporal foi concluída! Confira abaixo seus padrões predominantes.
                    {!analysisResult && analysisRequest.status === "em_analise" && (
                      <p className="mt-2 text-orange-600 font-medium">
                        A etapa de "Virada de Chave" ainda está sendo finalizada por nosso analista.
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
          
          {/* A seção "Seus Padrões Emocionais (Todos os 5)" foi movida para depois do título VIRADA DE CHAVE */}
          
          <div className="mt-6 flex flex-col gap-2">
            {!analysisResult ? (
              <>
                <Alert className="bg-slate-50 border-slate-200">
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Etapa 7 - Virada de Chave: Em breve</AlertTitle>
                  <AlertDescription>
                    A Etapa 7 (Virada de Chave) com sua análise detalhada está sendo preparada e estará disponível em breve.
                  </AlertDescription>
                </Alert>
                
                {analysisRequest?.status === "concluido" && (
                  <div className="mt-4 flex justify-end">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2" 
                      onClick={() => regenerateMutation.mutate()}
                      disabled={regenerateMutation.isPending}
                    >
                      {regenerateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Regerar Análise
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div ref={resultRef} className="p-6 bg-white rounded-lg border shadow-sm space-y-8 print:shadow-none print:border-none">
                {/* Cabeçalho com título principal */}
                <div className="mb-8 text-center px-4 py-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg shadow-sm border border-primary/20 print:bg-transparent print:border-dashed">
                  <h3 className="text-3xl font-bold text-primary mb-2">VIRADA DE CHAVE</h3>
                  <p className="text-slate-600">Devolutiva Personalizada • {new Date(analysisRequest.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                
                {/* Informações da análise */}
                <div className="mb-4 flex justify-center">
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                    <div>ID da Análise: <span className="font-medium">{analysisRequest.id}</span></div>
                    <div className="h-3 w-px bg-slate-300"></div>
                    <div>Usuário: <span className="font-medium">{user?.username || "Não disponível"}</span></div>
                    <div className="h-3 w-px bg-slate-300"></div>
                    <div>ID do Pedido: <span className="font-medium">{analysisRequest.requestId}</span></div>
                  </div>
                </div>
                
                {/* Seus Padrões Emocionais (Todos os 5) */}
                {bodyScoringTable && bodyScoringTable.primaryPattern && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
                    <h3 className="text-xl font-semibold mb-4">Seus Padrões Emocionais (Todos os 5):</h3>
                    <div className="space-y-3">
                      {/* Criar array com todos os padrões e seus percentuais para poder ordenar */}
                      {(() => {
                        const patternColors = {
                          'criativo': 'text-purple-600',
                          'conectivo': 'text-blue-600',
                          'forte': 'text-red-600',
                          'lider': 'text-yellow-600',
                          'competitivo': 'text-green-600'
                        };
                        
                        // Criar array com todos os padrões e percentuais
                        const allPatterns = [
                          { name: 'criativo', percentage: bodyScoringTable.creativoPercentage || 0 },
                          { name: 'conectivo', percentage: bodyScoringTable.conectivoPercentage || 0 },
                          { name: 'forte', percentage: bodyScoringTable.fortePercentage || 0 },
                          { name: 'lider', percentage: bodyScoringTable.liderPercentage || 0 },
                          { name: 'competitivo', percentage: bodyScoringTable.competitivoPercentage || 0 }
                        ];
                        
                        // Ordenar por percentual (do maior para o menor)
                        const sortedPatterns = allPatterns.sort((a, b) => b.percentage - a.percentage);
                        
                        // Renderizar todos os padrões ordenados
                        return sortedPatterns.map((pattern, index) => {
                          // Determinar estilo com base na posição
                          let style = "font-medium";
                          let size = "text-base";
                          
                          if (index === 0) {
                            style = "font-bold";
                            size = "text-lg";
                          } else if (index === 1) {
                            style = "font-semibold";
                          }
                          
                          const patternName = pattern.name.charAt(0).toUpperCase() + pattern.name.slice(1);
                          
                          return (
                            <div key={pattern.name} className={`flex justify-between items-center ${style} ${size} ${patternColors[pattern.name as keyof typeof patternColors]}`}>
                              <span>{index + 1}. {patternName}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 bg-gray-200 rounded-full h-2.5">
                                  <div 
                                    className={`h-2.5 rounded-full ${index === 0 ? 'bg-primary' : `bg-slate-500/50`}`} 
                                    style={{ width: `${pattern.percentage}%` }}
                                  ></div>
                                </div>
                                <span>{pattern.percentage}%</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
                
                {/* Gráficos para visualização das tendências */}
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gráfico de Ambição */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      <h4 className="text-lg font-semibold mb-3 text-center flex items-center justify-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" /> 
                        Tendência à Ambição
                      </h4>
                      <Suspense fallback={<div className="h-[250px] bg-slate-100 animate-pulse rounded flex justify-center items-center">Carregando gráfico...</div>}>
                        <LazyChart type="ambition" data={chartData} height={250} />
                      </Suspense>
                    </div>
                    
                    {/* Gráfico de Dependência Emocional */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      <h4 className="text-lg font-semibold mb-3 text-center flex items-center justify-center gap-2">
                        <Heart className="h-5 w-5 text-pink-500" /> 
                        Tendência à Dependência Emocional
                      </h4>
                      <Suspense fallback={<div className="h-[250px] bg-slate-100 animate-pulse rounded flex justify-center items-center">Carregando gráfico...</div>}>
                        <LazyChart type="dependency" data={chartData} height={250} />
                      </Suspense>
                    </div>
                  </div>
                </div>
                
                {/* Resumo dos Padrões Emocionais Predominantes */}
                <div className="mb-6">
                  <div className="p-5 bg-white rounded-lg border shadow-sm print:border-dashed print:shadow-none">
                    <h4 className="text-lg font-semibold text-center mb-4 text-primary border-b border-primary/10 pb-2">Seus Padrões Emocionais Predominantes</h4>
                    <div className="flex flex-wrap justify-center gap-3 mb-5">
                      {analysisResult.traco1Nome && analysisResult.traco1Percentual > 0 && (
                        <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/20 min-w-[110px]">
                          <div className="text-xl font-bold text-primary mb-1">{analysisResult.traco1Percentual}%</div>
                          <div className="text-slate-700 font-medium text-sm">{analysisResult.traco1Nome}</div>
                        </div>
                      )}
                      
                      {analysisResult.traco2Nome && analysisResult.traco2Percentual > 0 && (
                        <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/20 min-w-[110px]">
                          <div className="text-xl font-bold text-primary mb-1">{analysisResult.traco2Percentual}%</div>
                          <div className="text-slate-700 font-medium text-sm">{analysisResult.traco2Nome}</div>
                        </div>
                      )}
                      
                      {analysisResult.traco3Nome && analysisResult.traco3Percentual > 0 && (
                        <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/20 min-w-[110px]">
                          <div className="text-xl font-bold text-primary mb-1">{analysisResult.traco3Percentual}%</div>
                          <div className="text-slate-700 font-medium text-sm">{analysisResult.traco3Nome}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center mb-2">
                      <div className="inline-flex items-center px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                        <span className="text-amber-800 font-medium text-sm">
                          Área em Questão: {
                            // Verificar se block2PriorityArea é uma área válida
                            analysisResult.block2PriorityArea === "PESSOAL" ? "Saúde e Bem-estar" : 
                            analysisResult.block2PriorityArea === "PROFISSIONAL" ? "Carreira e Finanças" : 
                            analysisResult.block2PriorityArea === "RELACIONAMENTOS" ? "Relacionamentos Interpessoais" : 
                            // Se não for, usar a área da solicitação original
                            analysisRequest?.priorityArea === "health" ? "Saúde e Bem-estar" :
                            analysisRequest?.priorityArea === "professional" ? "Carreira e Finanças" :
                            analysisRequest?.priorityArea === "relationships" ? "Relacionamentos Interpessoais" :
                            // Último caso: mostrar texto genérico
                            "Área Pessoal"
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 🔹 Bloco 1 – Resposta à(s) Queixa(s) */}
                <div className="space-y-5">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-white font-bold text-sm">1</div>
                      <h4 className="text-xl font-medium text-primary">Resposta à(s) Queixa(s)</h4>
                    </div>
                    {(analysisRequest.complaint1 || analysisRequest.complaint2 || analysisRequest.complaint3) && (
                      <div className="ml-9 mt-1">
                        <p className="text-gray-600 text-sm italic">
                          Queixa(s) relatada(s): 
                          <span className="font-medium ml-1">
                            {analysisRequest.complaint1}
                            {analysisRequest.complaint2 && `, ${analysisRequest.complaint2}`}
                            {analysisRequest.complaint3 && `, ${analysisRequest.complaint3}`}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-5 bg-white rounded-lg border shadow-sm print:shadow-none print:border-dashed">
                    <div className="prose prose-slate max-w-none">
                      <div className="space-y-5">
                        <div>
                          <h5 className="text-base font-semibold text-primary mb-2">Diagnóstico Emocional</h5>
                          <p className="whitespace-pre-line text-gray-800 leading-relaxed">{analysisResult.diagnosticoEmocional}</p>
                        </div>
                        
                        <div>
                          <h5 className="text-base font-semibold text-primary mb-2">Explicação do Bloqueio</h5>
                          <p className="whitespace-pre-line text-gray-800 leading-relaxed">{analysisResult.explicacaoBloqueio}</p>
                        </div>
                        
                        <div>
                          <h5 className="text-base font-semibold text-primary mb-2">Caminho de Liberação</h5>
                          <p className="whitespace-pre-line text-gray-800 leading-relaxed">{analysisResult.caminhoLiberacao}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 🔹 Bloco 2 – Devolutiva do Comportamento na Dor e no Recurso */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-white font-bold text-sm">2</div>
                    <h4 className="text-xl font-medium text-primary">Devolutiva do Comportamento</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-5">
                    {/* Estado de DOR */}
                    <div className="p-5 bg-white rounded-lg border border-red-200 shadow-sm print:border-dashed print:shadow-none">
                      <h5 className="font-medium text-red-800 mb-3 text-center border-b border-red-100 pb-2">
                        <span className="flex items-center justify-center gap-2">
                          <X className="h-4 w-4 text-red-600" /> 
                          Estado Relacionado à Dor
                        </span>
                      </h5>
                      <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                        {analysisResult.block2PainDescription && typeof analysisResult.block2PainDescription === 'object' ? (
                          <div>
                            {analysisResult.block2PriorityArea === "PESSOAL" 
                              ? analysisResult.block2PainDescription.pessoal
                              : analysisResult.block2PriorityArea === "PROFISSIONAL"
                                ? analysisResult.block2PainDescription.profissional 
                                : analysisResult.block2PriorityArea === "RELACIONAMENTOS"
                                  ? analysisResult.block2PainDescription.relacionamentos
                                  : analysisRequest?.priorityArea === "health"
                                    ? analysisResult.block2PainDescription.pessoal
                                    : analysisRequest?.priorityArea === "professional"
                                      ? analysisResult.block2PainDescription.profissional
                                      : analysisRequest?.priorityArea === "relationships"
                                        ? analysisResult.block2PainDescription.relacionamentos
                                        : analysisResult.traco1Dor?.pessoal || ""}
                          </div>
                        ) : analysisResult.traco1Dor ? (
                          <div>
                            {analysisResult.priorityArea === "personal" || analysisResult.priorityArea === "health"
                              ? analysisResult.traco1Dor.pessoal
                              : analysisResult.priorityArea === "professional"
                                ? analysisResult.traco1Dor.profissional
                                : analysisResult.priorityArea === "relationships"
                                  ? analysisResult.traco1Dor.relacionamentos
                                  : analysisResult.traco1Dor.pessoal || ""}
                          </div>
                        ) : (
                          <p>Não foram encontradas informações sobre o estado de dor.</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Estado de RECURSO */}
                    <div className="p-5 bg-white rounded-lg border border-green-200 shadow-sm print:border-dashed print:shadow-none">
                      <h5 className="font-medium text-green-800 mb-3 text-center border-b border-green-100 pb-2">
                        <span className="flex items-center justify-center gap-2">
                          <Check className="h-4 w-4 text-green-600" /> 
                          Estado Relacionado ao Recurso
                        </span>
                      </h5>
                      <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                        {analysisResult.caminhoLiberacao ? (
                          // Usa o texto do campo caminhoLiberacao que contém a descrição completa dos recursos
                          analysisResult.caminhoLiberacao
                        ) : analysisResult.block2ResourceDescription && typeof analysisResult.block2ResourceDescription === 'object' ? (
                          // Fallback para block2ResourceDescription se disponível
                          analysisResult.block2PriorityArea === "PESSOAL" 
                            ? analysisResult.block2ResourceDescription.pessoal || ""
                            : analysisResult.block2PriorityArea === "PROFISSIONAL"
                              ? analysisResult.block2ResourceDescription.profissional || ""
                              : analysisResult.block2PriorityArea === "RELACIONAMENTOS"
                                ? analysisResult.block2ResourceDescription.relacionamentos || ""
                                : analysisRequest?.priorityArea === "health"
                                  ? analysisResult.block2ResourceDescription.pessoal || ""
                                  : analysisRequest?.priorityArea === "professional"
                                    ? analysisResult.block2ResourceDescription.profissional || ""
                                    : analysisRequest?.priorityArea === "relationships"
                                      ? analysisResult.block2ResourceDescription.relacionamentos || ""
                                      : ""
                        ) : analysisResult.traco1Recurso && analysisResult.priorityArea ? (
                          // Segundo fallback para traco1Recurso se disponível
                          analysisResult.priorityArea === "personal" || analysisResult.priorityArea === "health"
                            ? analysisResult.traco1Recurso.pessoal || ""
                            : analysisResult.priorityArea === "professional"
                              ? analysisResult.traco1Recurso.profissional || ""
                              : analysisResult.priorityArea === "relationships"
                                ? analysisResult.traco1Recurso.relacionamentos || ""
                                : ""
                        ) : (
                          // Mensagem se nenhum dado estiver disponível
                          "Não foram encontradas informações sobre o estado de recurso."
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Área de Prioridade removida conforme solicitado */}
                </div>
                
                {/* 🔹 Bloco 3 – Convite à Ação (Virada de Chave) */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-white font-bold text-sm">3</div>
                    <h4 className="text-xl font-medium text-primary">Convite à Ação (Virada de Chave) Para você Escrever e colocar data para Fazer</h4>
                  </div>
                  
                  <div className="p-5 bg-white rounded-lg border shadow-sm print:shadow-none print:border-dashed">
                    <div className="space-y-6">
                      <div>
                        <h5 className="text-base font-semibold text-primary mb-2">Com sua nova Percepção, Qual será sua Ação Imediata para ficar no Recurso?</h5>
                        <div className="p-3 border border-dashed border-gray-300 rounded-md bg-gray-50 min-h-[100px] print:bg-white print:border-gray-200">
                          <textarea 
                            className="w-full bg-transparent border-none focus:outline-none resize-none text-gray-700" 
                            placeholder="Escreva aqui uma ação que você pode tomar imediatamente para ficar no estado de recurso..."
                            rows={3}
                          ></textarea>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Data para executar:</span>
                            <input 
                              type="date" 
                              className="p-1 text-sm border border-gray-300 rounded bg-white" 
                              defaultValue={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-base font-semibold text-primary mb-2">Como Manter esse Padrão no Dia a Dia</h5>
                        <div className="p-3 border border-dashed border-gray-300 rounded-md bg-gray-50 min-h-[100px] print:bg-white print:border-gray-200">
                          <textarea 
                            className="w-full bg-transparent border-none focus:outline-none resize-none text-gray-700" 
                            placeholder="Anote aqui estratégias para manter padrões saudáveis no seu dia a dia..."
                            rows={3}
                          ></textarea>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Data para implementar:</span>
                            <input 
                              type="date" 
                              className="p-1 text-sm border border-gray-300 rounded bg-white" 
                              defaultValue={(() => {
                                const date = new Date();
                                date.setDate(date.getDate() + 7); // Data padrão +7 dias para começar a implementar
                                return date.toISOString().split('T')[0];
                              })()}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Botão de regeneração para análises concluídas */}
                {analysisRequest?.status === "concluido" && (
                  <div className="mt-6 flex justify-end">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2" 
                      onClick={() => regenerateMutation.mutate()}
                      disabled={regenerateMutation.isPending}
                    >
                      {regenerateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Regerar Análise
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-4">
          <Button 
            variant="outline" 
            disabled={!analysisResult || isGeneratingPDF}
            onClick={async () => {
              if (!resultRef.current || !analysisResult) return;
              
              try {
                setIsGeneratingPDF(true);
                toast({
                  title: "Gerando PDF",
                  description: "Por favor, aguarde enquanto geramos o arquivo PDF...",
                });
                
                const canvas = await html2canvas(resultRef.current, {
                  scale: 2,
                  logging: false,
                  useCORS: true
                });
                
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                // Calcular proporção para manter aspecto
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                const imgX = (pdfWidth - imgWidth * ratio) / 2;
                const imgY = 10;
                
                pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
                
                // Adicionar rodapé
                const today = new Date().toLocaleDateString('pt-BR');
                pdf.setFontSize(10);
                pdf.setTextColor(100, 100, 100);
                pdf.text(`Análise Emocional 6 Camadas - Gerado em ${today}`, 10, pdfHeight - 10);
                
                // Baixar PDF
                pdf.save(`analise_emocional_${analysisRequest?.id}_${today}.pdf`);
                
                toast({
                  title: "PDF gerado com sucesso!",
                  description: "O arquivo foi baixado para o seu dispositivo.",
                  variant: "default",
                });
              } catch (error) {
                console.error("Erro ao gerar PDF:", error);
                toast({
                  title: "Erro ao gerar PDF",
                  description: "Ocorreu um erro ao gerar o arquivo PDF. Por favor, tente novamente.",
                  variant: "destructive",
                });
              } finally {
                setIsGeneratingPDF(false);
              }
            }}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Baixar Resultado
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            disabled={!analysisResult || isSharing}
            onClick={async () => {
              if (!analysisResult) return;
              
              try {
                setIsSharing(true);
                
                // Verificar se a API de compartilhamento está disponível
                if (navigator.share) {
                  await navigator.share({
                    title: 'Minha Análise Emocional 6 Camadas',
                    text: `Confira minha análise emocional com os padrões: ${bodyScoringTable?.primaryPattern || ''}, ${bodyScoringTable?.secondaryPattern || ''}`,
                    url: window.location.href
                  });
                  
                  toast({
                    title: "Link compartilhado",
                    description: "O link da sua análise foi compartilhado com sucesso.",
                  });
                } else {
                  // Alternativa: copiar para a área de transferência
                  await navigator.clipboard.writeText(window.location.href);
                  
                  toast({
                    title: "Link copiado",
                    description: "O link da sua análise foi copiado para a área de transferência.",
                  });
                }
              } catch (error) {
                console.error("Erro ao compartilhar:", error);
                
                // Tentar copiar para a área de transferência como fallback
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  toast({
                    title: "Link copiado",
                    description: "O link da sua análise foi copiado para a área de transferência.",
                  });
                } catch (clipboardError) {
                  toast({
                    title: "Erro ao compartilhar",
                    description: "Não foi possível compartilhar. Tente copiar a URL manualmente.",
                    variant: "destructive",
                  });
                }
              } finally {
                setIsSharing(false);
              }
            }}
          >
            {isSharing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Compartilhando...
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* A tabela de pontuação corporal foi removida conforme solicitado */}
    </div>
  );
}