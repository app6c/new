import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, RefreshCw } from "lucide-react";

// Tipos
interface AnalysisRequest {
  id: number;
  requestId: string;
  analysisFor: 'myself' | 'other';
  otherReason?: string;
  hadSurgery: boolean;
  surgeryDetails?: string;
  hadTrauma: boolean;
  traumaDetails?: string;
  usedDevice: boolean;
  deviceDetails?: string;
  priorityArea: 'health' | 'relationships' | 'professional';
  complaint1: string;
  complaint2?: string;
  complaint3?: string;
  status: string;
  createdAt: string;
}

interface BodyScoringTable {
  id: number;
  analysisRequestId: number;
  primaryPattern: string;
  secondaryPattern: string;
  tertiaryPattern: string;
  creativoPercentage: number;
  conectivoPercentage: number;
  fortePercentage: number;
  liderPercentage: number;
  competitivoPercentage: number;
  scoredBy: string;
  scoringNotes?: string;
}

interface AnalysisResult {
  id?: number;
  analysisRequestId: number;
  
  // Bloco 1 - Resposta às Queixas
  diagnosticoEmocional: string;
  explicacaoBloqueio: string;
  caminhoLiberacao: string;
  
  // Bloco 2 - Devolutiva dos Top 3 Traços
  traco1Nome: string;
  traco1Percentual: number;
  traco1Dor: {
    pessoal: string;
    relacionamentos: string;
    profissional: string;
  };
  traco1Recurso: {
    pessoal: string;
    relacionamentos: string;
    profissional: string;
  };
  
  traco2Nome: string;
  traco2Percentual: number;
  traco2Dor: {
    pessoal: string;
    relacionamentos: string;
    profissional: string;
  };
  traco2Recurso: {
    pessoal: string;
    relacionamentos: string;
    profissional: string;
  };
  
  traco3Nome: string;
  traco3Percentual: number;
  traco3Dor: {
    pessoal: string;
    relacionamentos: string;
    profissional: string;
  };
  traco3Recurso: {
    pessoal: string;
    relacionamentos: string;
    profissional: string;
  };
  
  // Bloco 3 - Convite à Ação (Virada de Chave) - Removido conforme solicitado
  // Mantendo os campos para compatibilidade com o banco de dados
  acaoTraco1?: string;
  acaoTraco2?: string;
  acaoTraco3?: string;
  
  // Campos originais mantidos
  personalityPattern: string;
  analysisReport: string;
  strategicGuide: string;
  personalizedTips: any;
}

interface EmotionalPattern {
  id: number;
  patternType: string;
  areaType: string; 
  isPain: boolean; 
  description: string;
}

// Função auxiliar para obter a cor do padrão
function getPatternColor(pattern: string): string {
  switch (pattern.toUpperCase()) {
    case 'CRIATIVO':
      return 'text-purple-600';
    case 'CONECTIVO':
      return 'text-blue-500';
    case 'FORTE':
      return 'text-red-600';
    case 'LIDER':
      return 'text-amber-600';
    case 'COMPETITIVO':
      return 'text-green-600';
    default:
      return 'text-gray-700';
  }
}

function KeyTurnFeedbackForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("bloco1");
  const [isEditMode, setIsEditMode] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<AnalysisResult>({
    analysisRequestId: parseInt(id || '0'),
    diagnosticoEmocional: '',
    explicacaoBloqueio: '',
    caminhoLiberacao: '',
    traco1Nome: '',
    traco1Percentual: 0,
    traco1Dor: { pessoal: '', relacionamentos: '', profissional: '' },
    traco1Recurso: { pessoal: '', relacionamentos: '', profissional: '' },
    traco2Nome: '',
    traco2Percentual: 0,
    traco2Dor: { pessoal: '', relacionamentos: '', profissional: '' },
    traco2Recurso: { pessoal: '', relacionamentos: '', profissional: '' },
    traco3Nome: '',
    traco3Percentual: 0,
    traco3Dor: { pessoal: '', relacionamentos: '', profissional: '' },
    traco3Recurso: { pessoal: '', relacionamentos: '', profissional: '' },
    personalityPattern: '',
    analysisReport: '',
    strategicGuide: '',
    personalizedTips: {}
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Mutação para gerar automaticamente a virada de chave
  const { mutate: generateKeyTurn, isPending: isGeneratingKeyTurn } = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      try {
        // Primeiro cria um resultado básico se ainda não existir
        if (!existingResult) {
          // Se não tiver a tabela de pontuação, não faz nada
          if (!bodyScoringTable) {
            throw new Error("Tabela de pontuação não encontrada. Complete a pontuação corporal primeiro.");
          }
          
          const bst = bodyScoringTable as BodyScoringTable;
          
          // Criar texto inicial para os campos obrigatórios para passar na validação
          const initialDiagnostico = `Análise para padrão ${bst.primaryPattern || 'Predominante'} em processo de geração.`;
          const initialExplicacao = `Análise de bloqueio para padrão ${bst.primaryPattern || 'Predominante'} em processo de geração.`;
          const initialCaminho = `Sugestões de liberação para padrão ${bst.primaryPattern || 'Predominante'} em processo de geração.`;
          
          const initialResult = {
            analysisRequestId: parseInt(id || '0'),
            diagnosticoEmocional: initialDiagnostico,
            explicacaoBloqueio: initialExplicacao,
            caminhoLiberacao: initialCaminho,
            traco1Nome: bst.primaryPattern || '',
            traco1Percentual: getPercentageForPattern(bst, bst.primaryPattern || ''),
            traco1Dor: { pessoal: 'Em geração...', relacionamentos: 'Em geração...', profissional: 'Em geração...' },
            traco1Recurso: { pessoal: 'Em geração...', relacionamentos: 'Em geração...', profissional: 'Em geração...' },
            traco2Nome: bst.secondaryPattern || '',
            traco2Percentual: getPercentageForPattern(bst, bst.secondaryPattern || ''),
            traco2Dor: { pessoal: 'Em geração...', relacionamentos: 'Em geração...', profissional: 'Em geração...' },
            traco2Recurso: { pessoal: 'Em geração...', relacionamentos: 'Em geração...', profissional: 'Em geração...' },
            traco3Nome: bst.tertiaryPattern || '',
            traco3Percentual: getPercentageForPattern(bst, bst.tertiaryPattern || ''),
            traco3Dor: { pessoal: 'Em geração...', relacionamentos: 'Em geração...', profissional: 'Em geração...' },
            traco3Recurso: { pessoal: 'Em geração...', relacionamentos: 'Em geração...', profissional: 'Em geração...' },
            personalityPattern: bst.primaryPattern || '',
            analysisReport: 'Em geração...',
            strategicGuide: 'Em geração...',
            personalizedTips: {}
          };
          
          // Cria o resultado com os campos obrigatórios preenchidos
          await apiRequest("POST", "/api/analysis-results", initialResult);
        }
        
        // Em seguida, chama o endpoint de regeneração para processar os dados
        return apiRequest("POST", `/api/analysis-requests/${id}/regenerate`, {});
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/analysis-results/${id}`] });
      toast({
        title: "Virada de Chave Gerada",
        description: "A Virada de Chave foi gerada com sucesso. Atualize a página para ver os resultados.",
      });
      
      // Recarregar os dados da página para mostrar os resultados
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (error) => {
      toast({
        title: "Erro ao gerar Virada de Chave",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Buscar análise
  const { data: analysisRequest, isLoading: isLoadingRequest } = useQuery<AnalysisRequest>({
    queryKey: [`/api/analysis-requests/${id}`],
    enabled: !!id,
  });
  
  // Buscar tabela de pontuação corporal
  const { data: bodyScoringTable, isLoading: isLoadingTable } = useQuery({
    queryKey: [`/api/body-scoring-tables/request/${id}`],
    select: (data: BodyScoringTable) => data,
    enabled: !!id
  });
  
  // Buscar resultado existente da análise
  const { data: existingResult, isLoading: isLoadingResult } = useQuery<AnalysisResult>({
    queryKey: [`/api/analysis-results/${id}`],
    enabled: !!id,
  });
  
  // Mutação para salvar resultado da análise
  const { mutate: saveResult, isPending: isLoadingUpdateResult } = useMutation({
    mutationFn: async (resultData: Partial<AnalysisResult>) => {
      if (existingResult?.id) {
        // Atualizar resultado existente
        return apiRequest("PATCH", `/api/analysis-results/${existingResult.id}`, resultData);
      } else {
        // Criar novo resultado
        return apiRequest("POST", "/api/analysis-results", resultData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/analysis-results/${id}`] });
      toast({
        title: "Sucesso!",
        description: "Feedback salvo com sucesso.",
      });
      setIsEditMode(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutação para atualizar o status da análise para "concluído"
  const { mutate: markAsCompleted } = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/analysis-requests/${id}/status-concluido`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/analysis-requests/${id}`] });
      toast({
        title: "Análise Concluída",
        description: "A análise foi marcada como concluída e está disponível para o cliente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao concluir análise",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutação para atualizar o status da análise para "tem resultado"
  const { mutate: markAsHasResult } = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/analysis-requests/${id}/has-result`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/analysis-requests/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/all-analysis-requests`] });
      toast({
        title: "Resultado Disponível",
        description: "O resultado da análise está disponível para o cliente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar status",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Função para obter a porcentagem de um padrão específico
  function getPercentageForPattern(table: BodyScoringTable, pattern: string): number {
    switch (pattern.toUpperCase()) {
      case 'CRIATIVO':
        return table.creativoPercentage;
      case 'CONECTIVO':
        return table.conectivoPercentage;
      case 'FORTE':
        return table.fortePercentage;
      case 'LIDER':
        return table.liderPercentage;
      case 'COMPETITIVO':
        return table.competitivoPercentage;
      default:
        return 0;
    }
  }
  
  // Função para mapear a área selecionada
  function mapAreaType(area: string): string {
    switch (area) {
      case 'health':
        return 'Saúde';
      case 'relationships':
        return 'Relacionamentos';
      case 'professional':
        return 'Profissional';
      default:
        return area;
    }
  }
  
  // Função para renderizar o conteúdo do botão de salvar
  function renderSaveButtonContent() {
    if (isLoadingUpdateResult) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
        </>
      );
    }
    return "Salvar Alterações";
  }
  
  // Função para normalizar o tipo de padrão
  function normalizePatternType(pattern: string): string {
    pattern = pattern.toUpperCase();
    if (pattern === 'CRIATIVO') return 'CRIATIVO';
    if (pattern === 'CONECTIVO') return 'CONECTIVO';
    if (pattern === 'FORTE') return 'FORTE';
    if (pattern === 'LIDER') return 'LIDER';
    if (pattern === 'COMPETITIVO') return 'COMPETITIVO';
    return pattern;
  }
  
  // Efeito para preencher o formulário com dados existentes
  useEffect(() => {
    if (existingResult && !isEditMode) {
      const result = existingResult as any;
      setFeedbackForm({
        ...feedbackForm,
        ...result,
        // Certifique-se de que as estruturas aninhadas estão presentes
        traco1Dor: result.traco1Dor || { pessoal: '', relacionamentos: '', profissional: '' },
        traco1Recurso: result.traco1Recurso || { pessoal: '', relacionamentos: '', profissional: '' },
        traco2Dor: result.traco2Dor || { pessoal: '', relacionamentos: '', profissional: '' },
        traco2Recurso: result.traco2Recurso || { pessoal: '', relacionamentos: '', profissional: '' },
        traco3Dor: result.traco3Dor || { pessoal: '', relacionamentos: '', profissional: '' },
        traco3Recurso: result.traco3Recurso || { pessoal: '', relacionamentos: '', profissional: '' },
      });
    }
  }, [existingResult, isEditMode]);
  
  // Efeito para preencher os nomes dos padrões e percentuais com base na tabela de pontuação
  useEffect(() => {
    if (bodyScoringTable) {
      const updatedForm = { ...feedbackForm };
      
      if (bodyScoringTable.primaryPattern) {
        updatedForm.traco1Nome = normalizePatternType(bodyScoringTable.primaryPattern);
        updatedForm.traco1Percentual = getPercentageForPattern(bodyScoringTable, bodyScoringTable.primaryPattern);
      }
      
      if (bodyScoringTable.secondaryPattern) {
        updatedForm.traco2Nome = normalizePatternType(bodyScoringTable.secondaryPattern);
        updatedForm.traco2Percentual = getPercentageForPattern(bodyScoringTable, bodyScoringTable.secondaryPattern);
      }
      
      if (bodyScoringTable.tertiaryPattern) {
        updatedForm.traco3Nome = normalizePatternType(bodyScoringTable.tertiaryPattern);
        updatedForm.traco3Percentual = getPercentageForPattern(bodyScoringTable, bodyScoringTable.tertiaryPattern);
      }
      
      setFeedbackForm(updatedForm);
    }
  }, [bodyScoringTable, existingResult]);
  
  // Alternar modo de edição
  const handleToggleMode = () => {
    setIsEditMode(!isEditMode);
  };
  
  // Manipular mudanças nos campos
  const handleChange = (name: string, value: any) => {
    setFeedbackForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Manipular mudanças em campos aninhados
  const handleNestedChange = (parent: string, name: string, value: string) => {
    setFeedbackForm(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof typeof prev],
        [name]: value
      }
    }));
  };
  
  // Voltar para a página anterior
  const handleBack = () => {
    navigate("/analyst/analyses");
  };
  
  // Salvar alterações do Bloco 1
  const handleSaveBloco1 = () => {
    const formData = {
      analysisRequestId: parseInt(id || '0'),
      diagnosticoEmocional: feedbackForm.diagnosticoEmocional,
      explicacaoBloqueio: feedbackForm.explicacaoBloqueio,
      caminhoLiberacao: feedbackForm.caminhoLiberacao
    };
    
    saveResult(formData);
    
    // Se não existir resultado, marcar que a análise tem resultado
    if (!existingResult) {
      markAsHasResult();
    }
  };
  
  // Salvar alterações do Bloco 2
  const handleSaveBloco2 = () => {
    const formData = {
      analysisRequestId: parseInt(id || '0'),
      traco1Nome: feedbackForm.traco1Nome,
      traco1Percentual: feedbackForm.traco1Percentual,
      traco1Dor: feedbackForm.traco1Dor,
      traco1Recurso: feedbackForm.traco1Recurso,
      
      traco2Nome: feedbackForm.traco2Nome,
      traco2Percentual: feedbackForm.traco2Percentual,
      traco2Dor: feedbackForm.traco2Dor,
      traco2Recurso: feedbackForm.traco2Recurso,
      
      traco3Nome: feedbackForm.traco3Nome,
      traco3Percentual: feedbackForm.traco3Percentual,
      traco3Dor: feedbackForm.traco3Dor,
      traco3Recurso: feedbackForm.traco3Recurso
    };
    
    saveResult(formData);
    
    // Se não existir resultado, marcar que a análise tem resultado
    if (!existingResult) {
      markAsHasResult();
    }
  };
  
  // Marcar análise como concluída
  const handleMarkAsCompleted = () => {
    markAsCompleted();
  };
  
  // Carregando
  if (isLoadingRequest || isLoadingTable || isLoadingResult) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-xl">Carregando dados da análise...</p>
        </div>
      </div>
    );
  }
  
  // Se não encontrar a análise
  if (!analysisRequest) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Erro</p>
          <p>Não foi possível encontrar a análise solicitada.</p>
        </div>
        <Button variant="outline" onClick={handleBack} className="mt-4">
          <ChevronLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }
  
  // Se não encontrar a tabela de pontuação
  if (!bodyScoringTable) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Erro</p>
          <p>Não foi possível encontrar a tabela de pontuação para esta análise. Por favor, complete a pontuação corporal primeiro.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate(`/analysis/scoring/${id}`)} 
          className="mt-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" /> Ir para a Pontuação Corporal
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <h1 className="text-2xl font-bold">Formulário de Devolutiva - Virada de Chave</h1>
        
        {/* Botão para marcar como concluído */}
        <div className="ml-auto">
          <Button 
            onClick={handleMarkAsCompleted}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            Marcar como Concluído
          </Button>
        </div>
      </div>
      
      {/* Informações da análise */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-semibold mb-4">Informações da Análise</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">Tipo de Análise:</h3>
            <p>{analysisRequest.analysisFor === 'myself' ? 'Para si mesmo' : 'Para terceiro'}</p>
            
            <h3 className="font-semibold mt-4">Área Prioritária:</h3>
            <p>{mapAreaType(analysisRequest.priorityArea)}</p>
            
            <h3 className="font-semibold mt-4">Status:</h3>
            <p>{analysisRequest.status}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">Queixa 1:</h3>
            <p>{analysisRequest.complaint1}</p>
            
            {analysisRequest.complaint2 && (
              <>
                <h3 className="font-semibold mt-4">Queixa 2:</h3>
                <p>{analysisRequest.complaint2}</p>
              </>
            )}
            
            {analysisRequest.complaint3 && (
              <>
                <h3 className="font-semibold mt-4">Queixa 3:</h3>
                <p>{analysisRequest.complaint3}</p>
              </>
            )}
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div>
          <h3 className="font-semibold mb-2">Distribuição dos Padrões Emocionais:</h3>
          <div className="flex flex-col space-y-2">
            {/* Mostrar os percentuais em ordem */}
            {[
              { name: 'CRIATIVO', value: bodyScoringTable.creativoPercentage, color: 'text-purple-600' },
              { name: 'CONECTIVO', value: bodyScoringTable.conectivoPercentage, color: 'text-blue-500' },
              { name: 'FORTE', value: bodyScoringTable.fortePercentage, color: 'text-red-600' },
              { name: 'LIDER', value: bodyScoringTable.liderPercentage, color: 'text-amber-600' },
              { name: 'COMPETITIVO', value: bodyScoringTable.competitivoPercentage, color: 'text-green-600' }
            ]
              .sort((a, b) => b.value - a.value)
              .map((pattern, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className={`font-semibold ${pattern.color}`}>{pattern.name}:</span>
                  <span className="text-gray-800">{pattern.value}%</span>
                </div>
              ))}
          </div>
        </div>
      </div>
      
      {/* Tabs para edição de blocos */}
      {/* Botão para gerar a virada de chave automaticamente */}
      <div className="flex justify-center mb-6">
        <Button 
          onClick={() => generateKeyTurn()}
          disabled={isGeneratingKeyTurn}
          variant="default"
          className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
          size="lg"
        >
          {isGeneratingKeyTurn ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
              Gerando Virada de Chave...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-5 w-5" /> 
              Gerar Virada de Chave
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="bloco1">Resposta às Queixas</TabsTrigger>
          <TabsTrigger value="bloco2">Devolutiva (Dor ❌ Recurso ✅)</TabsTrigger>
        </TabsList>
        
        {/* BLOCO 1: Resposta às Queixas */}
        <TabsContent value="bloco1">
          <Card>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center mb-6 mt-4">
                <h2 className="text-2xl font-bold text-purple-800">Bloco 1 - Respostas às Queixas</h2>
                <Button variant="outline" onClick={handleToggleMode}>
                  {isEditMode ? "Cancelar Edição" : "Editar"}
                </Button>
              </div>

              {/* Campos para Diagnóstico Emocional */}
              <div>
                <h3 className="text-xl font-semibold text-purple-700 mb-2">Diagnóstico Emocional</h3>
                {isEditMode ? (
                  <Textarea
                    value={feedbackForm.diagnosticoEmocional}
                    onChange={(e) => handleChange("diagnosticoEmocional", e.target.value)}
                    placeholder="Digite o diagnóstico emocional..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-line">{feedbackForm.diagnosticoEmocional}</p>
                )}
              </div>

              {/* Campos para Explicação do Bloqueio */}
              <div>
                <h3 className="text-xl font-semibold text-purple-700 mb-2">Explicação do Bloqueio</h3>
                {isEditMode ? (
                  <Textarea
                    value={feedbackForm.explicacaoBloqueio}
                    onChange={(e) => handleChange("explicacaoBloqueio", e.target.value)}
                    placeholder="Digite a explicação do bloqueio..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-line">{feedbackForm.explicacaoBloqueio}</p>
                )}
              </div>

              {/* Campos para Caminho de Liberação */}
              <div>
                <h3 className="text-xl font-semibold text-purple-700 mb-2">Caminho de Liberação</h3>
                {isEditMode ? (
                  <Textarea
                    value={feedbackForm.caminhoLiberacao}
                    onChange={(e) => handleChange("caminhoLiberacao", e.target.value)}
                    placeholder="Digite o caminho de liberação..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-line">{feedbackForm.caminhoLiberacao}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full flex justify-end">
                <Button 
                  onClick={handleSaveBloco1} 
                  disabled={isLoadingUpdateResult || !isEditMode}
                >
                  {isLoadingUpdateResult ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* BLOCO 2: Devolutiva dos Top 3 Traços - Nova versão com Estados de Dor e Recurso */}
        <TabsContent value="bloco2">
          <Card>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center mb-6 mt-4">
                <h2 className="text-2xl font-bold text-purple-800">Bloco 2 - Devolutiva Dor e Recurso</h2>
                <Button variant="outline" onClick={handleToggleMode}>
                  {isEditMode ? "Cancelar Edição" : "Editar"}
                </Button>
              </div>
              
              {/* Informações sobre os padrões predominantes */}
              {bodyScoringTable && (
                <div className="p-4 bg-slate-50 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-2">Padrões Predominantes (Soma maior que 50%)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">
                        1. {bodyScoringTable.primaryPattern} ({getPercentageForPattern(bodyScoringTable, bodyScoringTable.primaryPattern)}%)
                      </p>
                      {bodyScoringTable.secondaryPattern && (
                        <p className="font-medium">
                          2. {bodyScoringTable.secondaryPattern} ({getPercentageForPattern(bodyScoringTable, bodyScoringTable.secondaryPattern)}%)
                        </p>
                      )}
                      {bodyScoringTable.tertiaryPattern && (
                        <p className="font-medium">
                          3. {bodyScoringTable.tertiaryPattern} ({getPercentageForPattern(bodyScoringTable, bodyScoringTable.tertiaryPattern)}%)
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Instruções:</span> Crie respostas humanizadas que combinem os padrões predominantes que somam mais de 50 por cento.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ESTADO DE DOR PREDOMINANTE */}
              <div className="border p-4 rounded-lg shadow-sm bg-red-50 border-red-200">
                <h3 className="text-xl font-bold text-red-800 mb-4 pb-2 border-b border-red-200">
                  Estado de Dor Predominante
                </h3>
                
                {/* Área Prioritária - mostrar apenas a área selecionada pelo cliente */}
                {analysisRequest?.priorityArea === 'health' && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-3 text-lg">Área Pessoal (Prioritária)</h4>
                    {isEditMode ? (
                      <Textarea
                        value={feedbackForm.traco1Dor.pessoal || ''}
                        onChange={(e) => handleNestedChange("traco1Dor", "pessoal", e.target.value)}
                        placeholder="Descreva detalhadamente a manifestação combinada dos padrões predominantes na área PESSOAL quando em estado de dor..."
                        className="min-h-[180px]"
                      />
                    ) : (
                      <div className="bg-white p-4 rounded border border-red-100">
                        <p className="text-gray-700 whitespace-pre-line">{feedbackForm.traco1Dor.pessoal}</p>
                        
                        {/* Se houver segundo traço, mostrar como parte do texto combinado */}
                        {feedbackForm.traco2Dor?.pessoal && feedbackForm.traco2Percentual > 10 && (
                          <p className="text-gray-700 whitespace-pre-line mt-2">{feedbackForm.traco2Dor.pessoal}</p>
                        )}
                        
                        {/* Se houver terceiro traço, mostrar como parte do texto combinado */}
                        {feedbackForm.traco3Dor?.pessoal && feedbackForm.traco3Percentual > 5 && (
                          <p className="text-gray-700 whitespace-pre-line mt-2">{feedbackForm.traco3Dor.pessoal}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Área de Relacionamentos (se for prioritária) */}
                {analysisRequest?.priorityArea === 'relationships' && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-3 text-lg">Área de Relacionamentos (Prioritária)</h4>
                    {isEditMode ? (
                      <Textarea
                        value={feedbackForm.traco1Dor.relacionamentos || ''}
                        onChange={(e) => handleNestedChange("traco1Dor", "relacionamentos", e.target.value)}
                        placeholder="Descreva detalhadamente a manifestação combinada dos padrões predominantes na área de RELACIONAMENTOS quando em estado de dor..."
                        className="min-h-[180px]"
                      />
                    ) : (
                      <div className="bg-white p-4 rounded border border-red-100">
                        <p className="text-gray-700 whitespace-pre-line">{feedbackForm.traco1Dor.relacionamentos}</p>
                        
                        {/* Se houver segundo traço, mostrar como parte do texto combinado */}
                        {feedbackForm.traco2Dor?.relacionamentos && feedbackForm.traco2Percentual > 10 && (
                          <p className="text-gray-700 whitespace-pre-line mt-2">{feedbackForm.traco2Dor.relacionamentos}</p>
                        )}
                        
                        {/* Se houver terceiro traço, mostrar como parte do texto combinado */}
                        {feedbackForm.traco3Dor?.relacionamentos && feedbackForm.traco3Percentual > 5 && (
                          <p className="text-gray-700 whitespace-pre-line mt-2">{feedbackForm.traco3Dor.relacionamentos}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Área Profissional (se for prioritária) */}
                {analysisRequest?.priorityArea === 'professional' && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-3 text-lg">Área Profissional (Prioritária)</h4>
                    {isEditMode ? (
                      <Textarea
                        value={feedbackForm.traco1Dor.profissional || ''}
                        onChange={(e) => handleNestedChange("traco1Dor", "profissional", e.target.value)}
                        placeholder="Descreva detalhadamente a manifestação combinada dos padrões predominantes na área PROFISSIONAL quando em estado de dor..."
                        className="min-h-[180px]"
                      />
                    ) : (
                      <div className="bg-white p-4 rounded border border-red-100">
                        <p className="text-gray-700 whitespace-pre-line">{feedbackForm.traco1Dor.profissional}</p>
                        
                        {/* Se houver segundo traço, mostrar como parte do texto combinado */}
                        {feedbackForm.traco2Dor?.profissional && feedbackForm.traco2Percentual > 10 && (
                          <p className="text-gray-700 whitespace-pre-line mt-2">{feedbackForm.traco2Dor.profissional}</p>
                        )}
                        
                        {/* Se houver terceiro traço, mostrar como parte do texto combinado */}
                        {feedbackForm.traco3Dor?.profissional && feedbackForm.traco3Percentual > 5 && (
                          <p className="text-gray-700 whitespace-pre-line mt-2">{feedbackForm.traco3Dor.profissional}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* ESTADO DE RECURSO PREDOMINANTE */}
              <div className="border p-4 rounded-lg shadow-sm bg-green-50 border-green-200 mt-8">
                <h3 className="text-xl font-bold text-green-800 mb-4 pb-2 border-b border-green-200">
                  Estado de Recurso Predominante
                </h3>
                
                {/* Área Prioritária - mostrar apenas a área selecionada pelo cliente */}
                {analysisRequest?.priorityArea === 'health' && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-3 text-lg">Área Pessoal (Prioritária)</h4>
                    {isEditMode ? (
                      <Textarea
                        value={feedbackForm.traco1Recurso.pessoal || ''}
                        onChange={(e) => handleNestedChange("traco1Recurso", "pessoal", e.target.value)}
                        placeholder="Descreva detalhadamente a manifestação combinada dos padrões predominantes na área PESSOAL quando em estado de recurso..."
                        className="min-h-[180px]"
                      />
                    ) : (
                      <div className="bg-white p-4 rounded border border-green-100">
                        <p className="text-gray-700 whitespace-pre-line">{feedbackForm.traco1Recurso.pessoal}</p>
                        
                        {/* Se houver segundo traço, mostrar como parte do texto combinado */}
                        {feedbackForm.traco2Recurso?.pessoal && feedbackForm.traco2Percentual > 10 && (
                          <p className="text-gray-700 whitespace-pre-line mt-2">{feedbackForm.traco2Recurso.pessoal}</p>
                        )}
                        
                        {/* Se houver terceiro traço, mostrar como parte do texto combinado */}
                        {feedbackForm.traco3Recurso?.pessoal && feedbackForm.traco3Percentual > 5 && (
                          <p className="text-gray-700 whitespace-pre-line mt-2">{feedbackForm.traco3Recurso.pessoal}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Área de Relacionamentos (se for prioritária) */}
                {analysisRequest?.priorityArea === 'relationships' && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-3 text-lg">Área de Relacionamentos (Prioritária)</h4>
                    {isEditMode ? (
                      <Textarea
                        value={feedbackForm.traco1Recurso.relacionamentos || ''}
                        onChange={(e) => handleNestedChange("traco1Recurso", "relacionamentos", e.target.value)}
                        placeholder="Descreva detalhadamente a manifestação combinada dos padrões predominantes na área de RELACIONAMENTOS quando em estado de recurso..."
                        className="min-h-[180px]"
                      />
                    ) : (
                      <div className="bg-white p-4 rounded border border-green-100">
                        <p className="text-gray-700 whitespace-pre-line">{feedbackForm.traco1Recurso.relacionamentos}</p>
                        
                        {/* Se houver segundo traço, mostrar como parte do texto combinado */}
                        {feedbackForm.traco2Recurso?.relacionamentos && feedbackForm.traco2Percentual > 10 && (
                          <p className="text-gray-700 whitespace-pre-line mt-2">{feedbackForm.traco2Recurso.relacionamentos}</p>
                        )}
                        
                        {/* Se houver terceiro traço, mostrar como parte do texto combinado */}
                        {feedbackForm.traco3Recurso?.relacionamentos && feedbackForm.traco3Percentual > 5 && (
                          <p className="text-gray-700 whitespace-pre-line mt-2">{feedbackForm.traco3Recurso.relacionamentos}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Área Profissional (se for prioritária) */}
                {analysisRequest?.priorityArea === 'professional' && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-3 text-lg">Área Profissional (Prioritária)</h4>
                    {isEditMode ? (
                      <Textarea
                        value={feedbackForm.traco1Recurso.profissional || ''}
                        onChange={(e) => handleNestedChange("traco1Recurso", "profissional", e.target.value)}
                        placeholder="Descreva detalhadamente a manifestação combinada dos padrões predominantes na área PROFISSIONAL quando em estado de recurso..."
                        className="min-h-[180px]"
                      />
                    ) : (
                      <div className="bg-white p-4 rounded border border-green-100">
                        <p className="text-gray-700 whitespace-pre-line">{feedbackForm.traco1Recurso.profissional}</p>
                        
                        {/* Se houver segundo traço, mostrar como parte do texto combinado */}
                        {feedbackForm.traco2Recurso?.profissional && feedbackForm.traco2Percentual > 10 && (
                          <p className="text-gray-700 whitespace-pre-line mt-2">{feedbackForm.traco2Recurso.profissional}</p>
                        )}
                        
                        {/* Se houver terceiro traço, mostrar como parte do texto combinado */}
                        {feedbackForm.traco3Recurso?.profissional && feedbackForm.traco3Percentual > 5 && (
                          <p className="text-gray-700 whitespace-pre-line mt-2">{feedbackForm.traco3Recurso.profissional}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Informação ao analista */}
              <div className="p-4 border border-dashed border-slate-300 rounded-lg bg-slate-50 mt-4">
                <h4 className="font-medium text-primary mb-2">Instrução para o Analista:</h4>
                <p className="text-sm text-slate-700">
                  Crie textos humanizados que conciliem os padrões emocionais predominantes (que somam mais de 50 por cento), 
                  fornecendo uma análise detalhada e aprofundada apenas na área prioritária escolhida pelo cliente. 
                  Não separe os padrões em seções, mas crie uma narrativa fluida e coerente 
                  que reflita a combinação dos padrões. Use linguagem natural e acessível.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full flex justify-end">
                <Button 
                  onClick={handleSaveBloco2} 
                  disabled={isLoadingUpdateResult || !isEditMode}
                >
                  {isLoadingUpdateResult ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default KeyTurnFeedbackForm;