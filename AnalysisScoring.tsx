import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import BodyScoringTable from '@/components/EmotionalAnalysis/BodyScoringTable';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// Componente com o conteúdo da análise
function AnalysisScoringContent() {
  const { analysisId } = useParams();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Buscar dados da solicitação de análise diretamente pelo ID da análise
  const { data: analysisRequest, isLoading, isError } = useQuery<any>({
    queryKey: [`/api/analysis-requests/${analysisId}`],
    queryFn: async () => {
      if (!analysisId) {
        console.error("Debug - ID da análise não fornecido");
        setError("ID da análise não fornecido");
        throw new Error("Analysis ID is required");
      }
      
      // Informações de debug para rastrear problemas
      console.log("AnalysisScoring - Debug Info:");
      console.log("- analysisId:", analysisId, typeof analysisId);
      console.log("- URL completa:", window.location.href);
      
      // Convertemos para número para garantir que estamos trabalhando com o ID numérico
      // Tratamento extra para garantir que temos um valor numérico válido
      const numericId = parseInt(String(analysisId).trim());
      if (isNaN(numericId) || numericId <= 0) {
        console.error("Debug - ID da análise inválido, não é um número positivo:", analysisId);
        setError("ID da análise inválido");
        throw new Error("Invalid analysis ID");
      }
      
      console.log("Buscando análise com ID numérico:", numericId);
      
      try {
        // Expandir o log para mostrar a URL completa sendo chamada
        console.log("Chamando API:", `/api/analysis-requests/${numericId}`);
        const response = await fetch(`/api/analysis-requests/${numericId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include"
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Erro ao buscar análise");
        }
        
        const data = await response.json();
        
        // Validação adicional para garantir que recebemos um objeto com um ID válido
        if (!data || typeof data !== 'object' || !data.id || isNaN(parseInt(String(data.id)))) {
          console.error("Debug - Resposta da API não contém um ID válido:", data);
          setError("Resposta da API não contém um ID válido");
          throw new Error("API response does not contain a valid ID");
        }
        
        console.log("Análise encontrada:", data);
        return data;
      } catch (err) {
        console.error("Erro ao buscar análise:", err);
        if (err instanceof Error) {
          console.error("Detalhes do erro:", err.stack);
          setError(`Erro ao carregar solicitação: ${err.message}`);
        } else {
          setError("Erro desconhecido ao carregar solicitação");
        }
        throw err;
      }
    },
    enabled: !!analysisId,
    retry: 1 // Reduzir o número de tentativas para evitar loops infinitos
  });
  
  // Verificar se a tabela de pontuação existe para esta solicitação
  const { data: bodyScoringTable } = useQuery<any>({
    queryKey: [`/api/body-scoring-tables/request/${analysisRequest?.id}`],
    queryFn: async () => {
      // Validação rigorosa do ID da análise antes de fazer a requisição
      if (!analysisRequest?.id) {
        console.log("ID da análise não disponível para buscar tabela de pontuação");
        return null;
      }
      
      // Converter para número para garantir que é um ID válido
      const numericId = parseInt(String(analysisRequest.id).trim());
      if (isNaN(numericId) || numericId <= 0) {
        console.error("ID da análise inválido para buscar tabela de pontuação:", analysisRequest.id);
        return null;
      }
      
      console.log("Buscando tabela de pontuação para análise ID:", numericId);
      
      try {
        const response = await fetch(`/api/body-scoring-tables/request/${numericId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include"
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log("Tabela de pontuação ainda não existe");
            return null;
          }
          const errorData = await response.json();
          throw new Error(errorData.message || "Erro ao buscar tabela de pontuação");
        }
        
        const data = await response.json();
        
        // Validar se os dados retornados são válidos
        if (!data || typeof data !== 'object') {
          console.error("Resposta inválida da API de tabela de pontuação:", data);
          return null;
        }
        
        console.log("Tabela de pontuação encontrada:", data);
        return data;
      } catch (err) {
        console.error("Erro ao buscar tabela de pontuação:", err);
        return null;
      }
    },
    enabled: !!analysisRequest?.id && !isNaN(parseInt(String(analysisRequest.id).trim())),
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 60 * 60 * 1000, // 1 hora
  });
  
  // Determinar se o botão para a Etapa 7 deve estar habilitado
  // Verifica se a tabela existe, foi salva e se tem os padrões primário, secundário e terciário definidos
  const canProceedToKeyTurn = !!bodyScoringTable && 
    !!bodyScoringTable.id &&  // Garante que a tabela foi salva no banco
    !!bodyScoringTable.primaryPattern && 
    !!bodyScoringTable.secondaryPattern && 
    !!bodyScoringTable.tertiaryPattern &&
    !!bodyScoringTable.updatedAt; // Confirma que houve uma atualização/salvamento
  
  if (isLoading) {
    return (
      <div className="container max-w-5xl py-8 mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <h2 className="text-2xl font-semibold text-center">Carregando dados da análise...</h2>
        </div>
      </div>
    );
  }
  
  if (isError || error) {
    return (
      <div className="container max-w-5xl py-8 mx-auto">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            {error || "Ocorreu um erro ao carregar os dados da solicitação de análise."}
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/analyst/analyses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a lista de análises
          </Link>
        </Button>
      </div>
    );
  }
  
  // Verificar se o status da solicitação permite avançar
  const isPaid = analysisRequest?.status !== 'aguardando_pagamento';
  
  return (
    <div className="container max-w-5xl py-8 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Link href="/analyst/analyses">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar para lista de análises
          </Button>
        </Link>
        
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isPaid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {isPaid ? 'Análise Liberada' : 'Aguardando Pagamento'}
          </div>
          <div className="text-sm text-slate-500">ID: {analysisId}</div>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">
            Etapa 6 - Análise Manual (Pontuação Corporal)
          </CardTitle>
          <CardDescription>
            Realize a análise das fotos e preencha a tabela de pontuação corporal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isPaid ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Aguardando Pagamento</AlertTitle>
              <AlertDescription>
                Esta solicitação de análise ainda está aguardando pagamento. Você pode fazer a pontuação agora, mas o cliente só poderá ver o resultado após o pagamento.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-green-50 border-green-200 mb-6">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700">Pronto para Análise</AlertTitle>
              <AlertDescription>
                Esta solicitação está paga e pronta para ser analisada. Preencha a tabela de pontuação a seguir.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-4">Instruções:</h3>
            <ol className="list-decimal pl-6 space-y-2 mb-6">
              <li>Observe atentamente as 4 fotos do cliente (clique na aba "Fotos")</li>
              <li>Distribua no máximo 10 pontos entre os padrões emocionais para cada parte do corpo</li>
              <li>Cada célula pode receber de 0 a 10 pontos</li>
              <li>Salve a tabela para calcular os totais e percentuais</li>
              <li>Confira os 3 padrões predominantes na aba "Resultados"</li>
            </ol>
          </div>
        </CardContent>
      </Card>
      
      {/* Sempre renderizar a tabela quando temos os dados da solicitação */}
      {analysisRequest && (
        <div>
          {/* Barra de ações para navegação entre etapas */}
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Etapa 6: Pontuação Corporal</h3>
            
            <div className="flex gap-2">
              {/* Botão para mostrar IDs */}
              <Button
                variant="outline"
                onClick={() => {
                  const idInfo = `ID da Análise: ${analysisRequest.id}\nRequest ID: ${analysisRequest.requestId}\n\nUse este ID para acessar a página de Virada de Chave: /analysis/key-turn/${analysisRequest.id}`;
                  toast({
                    title: "Informações de ID",
                    description: (
                      <pre className="mt-2 w-full rounded-md bg-slate-950 p-4">
                        <code className="text-white text-sm">{idInfo}</code>
                      </pre>
                    ),
                  });
                }}
              >
                <Info className="h-4 w-4 mr-2" /> 
                Mostrar IDs
              </Button>
              
              {/* Botão para ir para a Virada de Chave */}
              <Link href={`/analysis/key-turn/${analysisRequest.id}`}>
                <Button 
                  variant="default" 
                  className="flex items-center gap-2"
                  disabled={!canProceedToKeyTurn}
                  title={!canProceedToKeyTurn 
                    ? "É necessário preencher, salvar a tabela e calcular os padrões predominantes" 
                    : "Prosseguir para a próxima etapa"}
                >
                  <ChevronRight className="h-4 w-4" />
                  Gerar Virada de Chave
                  {!canProceedToKeyTurn && (
                    <span className="ml-2 text-xs">(Salve a tabela completa primeiro)</span>
                  )}
                </Button>
              </Link>
            </div>
          </div>
          
          {(() => {
            // Validação mais rigorosa do ID
            try {
              const safeId = analysisRequest?.id;
              
              // Validar se o ID é um número ou pode ser convertido em número
              if (safeId === undefined || safeId === null) {
                return (
                  <Alert variant="destructive">
                    <AlertTitle>Erro de ID</AlertTitle>
                    <AlertDescription>
                      Não foi possível obter um ID válido para esta análise. ID ausente ou inválido.
                    </AlertDescription>
                  </Alert>
                );
              }
              
              // Converter para string e depois para número para garantir que é um ID válido
              const numericId = parseInt(String(safeId).trim());
              
              if (isNaN(numericId) || numericId <= 0) {
                return (
                  <Alert variant="destructive">
                    <AlertTitle>Erro de ID</AlertTitle>
                    <AlertDescription>
                      ID inválido: {JSON.stringify(safeId)}. O ID deve ser um número positivo.
                    </AlertDescription>
                  </Alert>
                );
              }
              
              // Se chegou aqui, temos um ID válido
              return <BodyScoringTable analysisRequestId={numericId} />;
            } catch (error) {
              console.error("Erro ao validar ID da análise:", error);
              return (
                <Alert variant="destructive">
                  <AlertTitle>Erro inesperado</AlertTitle>
                  <AlertDescription>
                    Ocorreu um erro ao processar o ID da análise. Por favor, tente novamente ou contate o suporte.
                  </AlertDescription>
                </Alert>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
}

// Componente exportado diretamente
export default function AnalysisScoring() {
  return <AnalysisScoringContent />;
}