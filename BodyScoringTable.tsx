import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

// Tipos para as respostas da API
interface AnalysisRequestResponse {
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
  frontBodyPhoto?: string;
  backBodyPhoto?: string;
  seriousFacePhoto?: string;
  smilingFacePhoto?: string;
  status: string;
  paymentIntentId?: string;
  amount: number;
  createdAt: string;
}

interface BodyScoringTableResponse {
  id: number;
  analysisRequestId: number;
  scoredBy: string;
  scoringNotes?: string;
  updatedAt: string;
  primaryPattern?: string;
  secondaryPattern?: string;
  tertiaryPattern?: string;
  [key: string]: any; // Para os campos dinâmicos (pontuações)
}
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  ArrowRight, 
  Calculator, 
  Eye, 
  Loader2, 
  Save,
  FileText,
  Crown
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Tipos de padrão emocional
const patternTypes = ["CRIATIVO", "CONECTIVO", "FORTE", "LIDER", "COMPETITIVO"] as const;
type PatternType = typeof patternTypes[number];

// Partes do corpo para pontuação
const bodyParts = ["Formato da Cabeça", "Olhos", "Boca", "Tronco", "Cintura", "Pernas"] as const;
type BodyPart = typeof bodyParts[number];

// Cores para os padrões
const patternColors: Record<PatternType, string> = {
  "CRIATIVO": "bg-blue-200 text-blue-800 hover:bg-blue-300",
  "CONECTIVO": "bg-green-200 text-green-800 hover:bg-green-300",
  "FORTE": "bg-red-200 text-red-800 hover:bg-red-300",
  "LIDER": "bg-yellow-200 text-yellow-800 hover:bg-yellow-300",
  "COMPETITIVO": "bg-purple-200 text-purple-800 hover:bg-purple-300",
};

// Mapeamento de chaves de API para partes do corpo e padrões 
// Importante: A tabela no banco tem colunas como 'criativo_head', 'criativo_chest', etc.
type ApiKeyMapType = Record<PatternType, Record<BodyPart | "Total" | "Percentual", string>>;
const apiKeyMap: ApiKeyMapType = {
  "CRIATIVO": {
    "Formato da Cabeça": "creativoHead",
    "Olhos": "creativoChest", // Mapeado para 'chest' no banco (coluna existente)
    "Boca": "creativoShoulder", // Mapeado para 'shoulder' no banco
    "Tronco": "creativoBack", // Mapeado para 'back' no banco
    "Cintura": "creativoHead", // Mapeado para campo existente
    "Pernas": "creativoLegs",
    "Total": "creativoTotal",
    "Percentual": "creativoPercentage"
  },
  "CONECTIVO": {
    "Formato da Cabeça": "conectivoHead",
    "Olhos": "conectivoChest",
    "Boca": "conectivoShoulder",
    "Tronco": "conectivoBack",
    "Cintura": "conectivoHead",
    "Pernas": "conectivoLegs",
    "Total": "conectivoTotal",
    "Percentual": "conectivoPercentage"
  },
  "FORTE": {
    "Formato da Cabeça": "forteHead",
    "Olhos": "forteChest",
    "Boca": "forteShoulder",
    "Tronco": "forteBack",
    "Cintura": "forteHead",
    "Pernas": "forteLegs",
    "Total": "forteTotal",
    "Percentual": "fortePercentage"
  },
  "LIDER": {
    "Formato da Cabeça": "liderHead",
    "Olhos": "liderChest",
    "Boca": "liderShoulder",
    "Tronco": "liderBack",
    "Cintura": "liderHead",
    "Pernas": "liderLegs",
    "Total": "liderTotal",
    "Percentual": "liderPercentage"
  },
  "COMPETITIVO": {
    "Formato da Cabeça": "competitivoHead",
    "Olhos": "competitivoChest",
    "Boca": "competitivoShoulder",
    "Tronco": "competitivoBack",
    "Cintura": "competitivoHead",
    "Pernas": "competitivoLegs",
    "Total": "competitivoTotal",
    "Percentual": "competitivoPercentage"
  }
};

interface BodyScoringTableProps {
  analysisRequestId: number;
  readonly?: boolean;
}

export default function BodyScoringTable({ analysisRequestId, readonly = false }: BodyScoringTableProps) {
  // Debug do componente
  console.log("BodyScoringTable - analysisRequestId:", analysisRequestId, typeof analysisRequestId);

  const { toast } = useToast();
  // Só existem duas abas agora: "photos" e "scoring"
  const [activeTab, setActiveTab] = useState("scoring");
  const [scoringData, setScoringData] = useState<any>({
    analysisRequestId: analysisRequestId,
    scoredBy: "Analista",
    scoringNotes: "",
  });
  const [totalPoints, setTotalPoints] = useState(0);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  
  // Buscar tabela existente ou criar uma nova
  const { data: existingTable, isLoading, error } = useQuery<BodyScoringTableResponse | null>({
    queryKey: [`/api/body-scoring-tables/request/${analysisRequestId}`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/body-scoring-tables/request/${analysisRequestId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          const errorData = await response.json();
          throw new Error(errorData.message || "Erro ao buscar tabela de pontuação");
        }
        
        const data = await response.json();
        return data as BodyScoringTableResponse;
      } catch (err) {
        // Se não existe, retorna null (não é um erro)
        if (err instanceof Error && err.message.includes('404')) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutos
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
  
  // Buscar as fotos da solicitação de análise
  const { data: analysisRequest } = useQuery<AnalysisRequestResponse>({
    queryKey: [`/api/analysis-requests/${analysisRequestId}`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/analysis-requests/${analysisRequestId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Erro ao buscar solicitação de análise");
        }
        
        const data = await response.json();
        return data as AnalysisRequestResponse;
      } catch (err) {
        console.error("Erro ao buscar solicitação de análise:", err);
        throw err;
      }
    },
    enabled: !!analysisRequestId,
    staleTime: 30 * 60 * 1000, // 30 minutos
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
  
  // Mutation para criar uma nova tabela
  const createTableMutation = useMutation({
    mutationFn: async (data: any) => {
      // Se não temos ID, não podemos criar a tabela
      if (!analysisRequestId) {
        throw new Error("ID da solicitação de análise não encontrado");
      }
      
      // Número inteiro para garantir que o envio seja um número
      const analysisRequestIdNum = parseInt(String(analysisRequestId), 10);
      if (isNaN(analysisRequestIdNum)) {
        throw new Error("ID da solicitação de análise inválido");
      }
      
      // Log para verificação
      console.log("Enviando para criação com analysisRequestId:", analysisRequestIdNum);
      
      const bodyData = {
        ...data,
        analysisRequestId: analysisRequestIdNum,
        scoredBy: "Analista", // Valor padrão
      };
      
      const response = await fetch('/api/body-scoring-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(bodyData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao criar tabela de pontuação");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tabela criada com sucesso!",
        description: "A tabela de pontuação foi criada e os totais calculados automaticamente.",
      });
      // Recarregar a tabela
      queryClient.invalidateQueries({ queryKey: [`/api/body-scoring-tables/request/${analysisRequestId}`] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar tabela",
        description: `Ocorreu um erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation para atualizar uma tabela existente
  const updateTableMutation = useMutation({
    mutationFn: async (data: { id: number, updates: any }) => {
      // Garantir que o analysisRequestId esteja sempre presente e seja um número válido
      const analysisRequestIdNum = parseInt(String(analysisRequestId), 10);
      if (isNaN(analysisRequestIdNum)) {
        throw new Error("ID da solicitação de análise inválido");
      }
      
      // Adicionar o ID da solicitação aos dados de atualização
      const updatesWithId = {
        ...data.updates,
        analysisRequestId: analysisRequestIdNum,
      };
      
      console.log(`Atualizando tabela ID ${data.id} com analysisRequestId:`, analysisRequestIdNum);
      
      const response = await fetch(`/api/body-scoring-tables/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatesWithId)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao atualizar tabela de pontuação");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tabela atualizada com sucesso!",
        description: "As pontuações foram salvas e os totais atualizados.",
      });
      // Recarregar a tabela
      queryClient.invalidateQueries({ queryKey: [`/api/body-scoring-tables/request/${analysisRequestId}`] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar tabela",
        description: `Ocorreu um erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation para recalcular totais da tabela
  const calculateTotalsMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/body-scoring-tables/${id}/calculate-totals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao recalcular totais da tabela");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Totais recalculados com sucesso!",
        description: "Os totais e percentuais foram recalculados com base nas pontuações.",
      });
      // Recarregar a tabela
      queryClient.invalidateQueries({ queryKey: [`/api/body-scoring-tables/request/${analysisRequestId}`] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao recalcular totais",
        description: `Ocorreu um erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    }
  });
  
  // Quando a tabela existente é carregada, atualizar o estado local
  useEffect(() => {
    if (existingTable) {
      setScoringData(existingTable);
    }
  }, [existingTable]);
  
  // Calculador de totais e percentuais
  const calculateTotalsAndPercentages = useCallback(() => {
    // Calcular o total para cada padrão (coluna) e atualizar os Totais e Percentuais
    const updatedData: Record<string, any> = { ...scoringData };
    let grandTotal = 0;
    const patternTotals: Record<string, number> = {};
    
    // Passo 1: Calcular os totais por padrão
    patternTypes.forEach(pattern => {
      let patternTotal = 0;
      
      bodyParts.forEach(part => {
        const key = apiKeyMap[pattern][part];
        const value = Number(scoringData[key] || 0);
        patternTotal += value;
      });
      
      const totalKey = apiKeyMap[pattern]["Total"];
      updatedData[totalKey] = patternTotal;
      patternTotals[pattern] = patternTotal;
      grandTotal += patternTotal;
    });
    
    // Passo 2: Calcular percentuais para cada padrão
    if (grandTotal > 0) {
      patternTypes.forEach(pattern => {
        const percentageKey = apiKeyMap[pattern]["Percentual"];
        const percentage = Math.round((patternTotals[pattern] / grandTotal) * 100);
        updatedData[percentageKey] = percentage;
      });
    }
    
    // Só atualizar se realmente houver mudanças
    if (JSON.stringify(updatedData) !== JSON.stringify(scoringData)) {
      setScoringData(updatedData);
    }
    
    setTotalPoints(grandTotal);
  }, [scoringData, apiKeyMap]);
  
  // Não calculamos totais automaticamente, somente quando o usuário salva ou clica em calcular totais
  // O recálculo automático foi removido para não alterar valores inseridos manualmente
  // useEffect(() => {
  //   calculateTotalsAndPercentages();
  // }, [calculateTotalsAndPercentages]);
  
  // Atualizar uma pontuação individual
  const handleScoreChange = (pattern: PatternType, bodyPart: BodyPart | "Total" | "Percentual", value: number) => {
    const key = apiKeyMap[pattern][bodyPart];
    
    // Validar se o valor está entre 0 e 10
    const validValue = Math.min(Math.max(value, 0), 10);
    
    // Calcular o total atual da linha (parte do corpo) sem incluir o valor que está sendo alterado
    let rowTotal = 0;
    patternTypes.forEach(pat => {
      if (pat !== pattern) {
        const cellKey = apiKeyMap[pat][bodyPart];
        rowTotal += Number(scoringData[cellKey] || 0);
      }
    });
    
    // Verificar se o novo valor excederia 10 pontos para esta parte do corpo
    if (rowTotal + validValue > 10) {
      // Limitar o valor para não exceder 10 no total da linha
      const adjustedValue = 10 - rowTotal;
      
      toast({
        title: "Limite de 10 pontos por parte do corpo",
        description: `Ajustamos o valor para ${adjustedValue} para manter o total em 10 pontos para ${bodyPart}.`,
      });
      
      setScoringData((prev: Record<string, any>) => ({
        ...prev,
        [key]: adjustedValue >= 0 ? adjustedValue : 0
      }));
    } else {
      // Atualizar o valor diretamente se estiver dentro do limite
      setScoringData((prev: Record<string, any>) => ({
        ...prev,
        [key]: validValue
      }));
    }
  };
  
  // Salvar a tabela (criar nova ou atualizar existente)
  const handleSave = async () => {
    setSaving(true);
    
    // Calcular padrões principais com base nos percentuais
    const percentages = [
      { pattern: 'CRIATIVO', value: scoringData['creativoPercentage'] || 0 },
      { pattern: 'CONECTIVO', value: scoringData['conectivoPercentage'] || 0 },
      { pattern: 'FORTE', value: scoringData['fortePercentage'] || 0 },
      { pattern: 'LIDER', value: scoringData['liderPercentage'] || 0 },
      { pattern: 'COMPETITIVO', value: scoringData['competitivoPercentage'] || 0 }
    ];
    
    // Ordenar por valor de percentual (decrescente)
    percentages.sort((a, b) => b.value - a.value);
    
    // Definir padrões principais
    const primaryPattern = percentages[0].value > 0 ? percentages[0].pattern : '';
    const secondaryPattern = percentages[1].value > 0 ? percentages[1].pattern : '';
    const tertiaryPattern = percentages[2].value > 0 ? percentages[2].pattern : '';
    
    // Garantir que o ID da solicitação seja um número válido
    const analysisRequestIdNum = parseInt(String(analysisRequestId), 10);
    if (isNaN(analysisRequestIdNum)) {
      toast({
        title: "Erro ao salvar",
        description: "ID da solicitação de análise inválido.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }
    
    // Adicionar padrões principais aos dados a serem salvos
    const dataToSave = {
      ...scoringData,
      analysisRequestId: analysisRequestIdNum, // Certifique-se de incluir sempre
      primaryPattern,
      secondaryPattern,
      tertiaryPattern,
      scoredBy: "Analista", // Manter valor consistente
    };
    
    console.log("Dados para salvar:", dataToSave);
    
    try {
      let tableId;
      if (existingTable?.id) {
        // Atualizar tabela existente
        const result = await updateTableMutation.mutateAsync({ 
          id: existingTable.id, 
          updates: dataToSave 
        });
        tableId = existingTable.id;
        console.log("Tabela atualizada com sucesso:", result);
      } else {
        // Criar nova tabela
        const result = await createTableMutation.mutateAsync(dataToSave);
        console.log("Tabela criada:", result);
        if (result && result.tableId) {
          tableId = result.tableId;
        }
      }
      
      // Exibe mensagem com link para Virada de Chave se todos os padrões estiverem definidos
      if (primaryPattern && secondaryPattern && tertiaryPattern) {
        toast({
          title: "Tabela salva com sucesso!",
          description: 
            `Os padrões identificados foram: ${primaryPattern} (${percentages[0].value}%), 
             ${secondaryPattern} (${percentages[1].value}%), 
             ${tertiaryPattern} (${percentages[2].value}%).
             Agora você pode gerar a Virada de Chave para esta análise.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Tabela salva com sucesso!",
          description: "Preencha todos os campos para identificar os padrões predominantes.",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar a tabela de pontuação.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Recalcular totais manualmente
  const handleCalculateTotals = async () => {
    if (!existingTable?.id) {
      toast({
        title: "Tabela não encontrada",
        description: "Salve a tabela primeiro antes de recalcular os totais.",
        variant: "destructive",
      });
      return;
    }
    
    // Confirmação antes de calcular totais
    if (confirm("ATENÇÃO: O cálculo de totais e porcentagens será baseado apenas nos pontos existentes na tabela. Somente os totais e percentuais serão alterados, não os pontos individuais inseridos manualmente. Deseja continuar?")) {
      // Calcular totais localmente antes de enviar para o servidor
      calculateTotalsAndPercentages();
      
      // Usar a API para recalcular e salvar no servidor
      if (existingTable?.id) {
        setCalculating(true);
        try {
          await calculateTotalsMutation.mutateAsync(existingTable.id);
          toast({
            title: "Totais recalculados com sucesso",
            description: "Os totais e percentuais foram recalculados com base nos pontos que você atribuiu. Os pontos originais não foram alterados.",
          });
        } catch (error) {
          toast({
            title: "Erro ao recalcular totais",
            description: "Ocorreu um erro ao processar os totais no servidor.",
            variant: "destructive",
          });
        } finally {
          setCalculating(false);
        }
      }
    }
  };
  
  // Atualizar as notas de pontuação
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScoringData((prev: Record<string, any>) => ({
      ...prev,
      scoringNotes: e.target.value
    }));
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Carregando tabela de pontuação...</span>
      </div>
    );
  }
  
  const primaryPattern = existingTable?.primaryPattern || '';
  const secondaryPattern = existingTable?.secondaryPattern || '';
  const tertiaryPattern = existingTable?.tertiaryPattern || '';
  const primaryPercentage = primaryPattern && apiKeyMap[primaryPattern as PatternType] 
    ? existingTable?.[apiKeyMap[primaryPattern as PatternType]["Percentual"]] || 0
    : 0;
  const secondaryPercentage = secondaryPattern && apiKeyMap[secondaryPattern as PatternType]
    ? existingTable?.[apiKeyMap[secondaryPattern as PatternType]["Percentual"]] || 0
    : 0;
  const tertiaryPercentage = tertiaryPattern && apiKeyMap[tertiaryPattern as PatternType]
    ? existingTable?.[apiKeyMap[tertiaryPattern as PatternType]["Percentual"]] || 0
    : 0;
  
  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary">
          Tabela de Pontuação Corporal
          {readonly && <span className="ml-2 text-sm text-gray-500">(Modo de visualização)</span>}
        </CardTitle>
        <CardDescription>
          {readonly 
            ? "Visualize a tabela de pontuação e os padrões emocionais identificados."
            : "Atribua de 0 a 10 pontos para cada célula conforme sua análise dos padrões emocionais."}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="photos" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Fotos
            </TabsTrigger>
            <TabsTrigger value="scoring" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Tabela de Pontuação
            </TabsTrigger>
          </TabsList>
          
          {/* Aba de Fotos */}
          <TabsContent value="photos">
            {/* Informações sobre cirurgia, trauma e dispositivo */}
            {analysisRequest && (
              <div className="mb-6 border rounded-lg p-4 bg-muted/30">
                <h3 className="text-lg font-medium mb-3">Informações Adicionais</h3>
                <div className="space-y-3">
                  {analysisRequest.hadSurgery && (
                    <div>
                      <span className="text-primary font-semibold">Realizou Cirurgia:</span> 
                      <p className="mt-1 text-sm">{analysisRequest.surgeryDetails || "Sim (sem detalhes informados)"}</p>
                    </div>
                  )}
                  
                  {analysisRequest.hadTrauma && (
                    <div>
                      <span className="text-primary font-semibold">Sofreu Trauma Físico:</span> 
                      <p className="mt-1 text-sm">{analysisRequest.traumaDetails || "Sim (sem detalhes informados)"}</p>
                    </div>
                  )}
                  
                  {analysisRequest.usedDevice && (
                    <div>
                      <span className="text-primary font-semibold">Utilizou Dispositivo/Aparelho:</span> 
                      <p className="mt-1 text-sm">{analysisRequest.deviceDetails || "Sim (sem detalhes informados)"}</p>
                    </div>
                  )}
                  
                  {!analysisRequest.hadSurgery && !analysisRequest.hadTrauma && !analysisRequest.usedDevice && (
                    <div className="text-sm italic">
                      Não foram relatadas cirurgias, traumas físicos ou uso de dispositivos.
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {analysisRequest && (
                <>
                  {analysisRequest.frontBodyPhoto && (
                    <div className="overflow-hidden rounded-lg">
                      <h3 className="font-medium mb-2">Corpo - Frente</h3>
                      <img 
                        src={analysisRequest.frontBodyPhoto} 
                        alt="Foto Corpo Frente" 
                        className="w-full h-auto max-h-96 object-contain border rounded"
                      />
                    </div>
                  )}
                  {analysisRequest.backBodyPhoto && (
                    <div className="overflow-hidden rounded-lg">
                      <h3 className="font-medium mb-2">Corpo - Costas</h3>
                      <img 
                        src={analysisRequest.backBodyPhoto} 
                        alt="Foto Corpo Costas" 
                        className="w-full h-auto max-h-96 object-contain border rounded"
                      />
                    </div>
                  )}
                  {analysisRequest.seriousFacePhoto && (
                    <div className="overflow-hidden rounded-lg">
                      <h3 className="font-medium mb-2">Rosto - Sério</h3>
                      <img 
                        src={analysisRequest.seriousFacePhoto} 
                        alt="Foto Rosto Sério" 
                        className="w-full h-auto max-h-96 object-contain border rounded"
                      />
                    </div>
                  )}
                  {analysisRequest.smilingFacePhoto && (
                    <div className="overflow-hidden rounded-lg">
                      <h3 className="font-medium mb-2">Rosto - Sorrindo</h3>
                      <img 
                        src={analysisRequest.smilingFacePhoto} 
                        alt="Foto Rosto Sorrindo" 
                        className="w-full h-auto max-h-96 object-contain border rounded"
                      />
                    </div>
                  )}
                </>
              )}
              
              {!analysisRequest && (
                <Alert className="col-span-2">
                  <AlertTitle>Fotos não encontradas</AlertTitle>
                  <AlertDescription>
                    Não foi possível carregar as fotos desta solicitação de análise.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
          
          {/* Aba de Pontuação */}
          <TabsContent value="scoring">
            <div className="mb-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertTitle>
                  Instruções de Pontuação
                </AlertTitle>
                <AlertDescription>
                  Cada célula pode ter de 0 a 10 pontos. Não há limite de pontos por padrão (coluna), mas cada linha (parte do corpo) deve somar no máximo 10 pontos no total.
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="overflow-x-auto">
              <Table className="border-collapse w-full">
                <TableCaption>Tabela de pontuação dos padrões corporais. Cada linha (parte do corpo) deve somar no máximo 10 pontos no total.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px] bg-muted/50">Corpo/Padrão</TableHead>
                    {patternTypes.map(pattern => (
                      <TableHead key={pattern} className={`font-medium ${patternColors[pattern]} text-center`}>
                        {pattern}
                      </TableHead>
                    ))}
                    <TableHead className="bg-muted/50 text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Linhas para cada parte do corpo */}
                  {bodyParts.map(part => {
                    // Calcular total por parte do corpo (linha)
                    let rowTotal = 0;
                    patternTypes.forEach(pattern => {
                      rowTotal += Number(scoringData[apiKeyMap[pattern][part]] || 0);
                    });
                    
                    return (
                      <TableRow key={part}>
                        <TableCell className="font-medium bg-muted/30">
                          {part}
                        </TableCell>
                        {patternTypes.map(pattern => (
                          <TableCell key={`${part}-${pattern}`} className="text-center">
                            {readonly ? (
                              <span>{scoringData[apiKeyMap[pattern][part]] || 0}</span>
                            ) : (
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                value={scoringData[apiKeyMap[pattern][part]] || 0}
                                onChange={(e) => handleScoreChange(pattern, part, parseInt(e.target.value) || 0)}
                                className="w-16 h-9 text-center mx-auto"
                              />
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="font-medium text-center bg-muted/30">
                          {rowTotal}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Linha de totais */}
                  <TableRow className="bg-muted/20">
                    <TableCell className="font-bold">Total</TableCell>
                    {patternTypes.map(pattern => (
                      <TableCell key={`total-${pattern}`} className="font-bold text-center">
                        {scoringData[apiKeyMap[pattern]["Total"]] || 0}
                      </TableCell>
                    ))}
                    <TableCell className="font-bold text-center">
                      {totalPoints}
                    </TableCell>
                  </TableRow>
                  
                  {/* Linha de percentuais */}
                  <TableRow className="bg-muted/20">
                    <TableCell className="font-bold">%</TableCell>
                    {patternTypes.map(pattern => (
                      <TableCell key={`percentage-${pattern}`} className="font-bold text-center">
                        {scoringData[apiKeyMap[pattern]["Percentual"]] || 0}%
                      </TableCell>
                    ))}
                    <TableCell></TableCell>
                  </TableRow>
                
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">
                Notas de Pontuação (observações, justificativas):
              </label>
              <Textarea
                value={scoringData.scoringNotes || ""}
                onChange={handleNotesChange}
                placeholder="Adicione notas ou observações sobre a pontuação..."
                className="resize-y min-h-[100px]"
                disabled={readonly}
              />
            </div>
          </TabsContent>
          

        </Tabs>
      </CardContent>
      
      {/* Adiciona um componente informativo após salvar a tabela */}
      {existingTable?.primaryPattern && existingTable?.secondaryPattern && existingTable?.tertiaryPattern && (
        <Alert className="mx-6 mb-4 border-green-200 bg-green-50">
          <Crown className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-700">Pontuação completa - Pronto para gerar Virada de Chave</AlertTitle>
          <AlertDescription className="text-green-600">
            <div className="mb-2">
              Os padrões identificados para esta análise foram:
              <ul className="list-disc list-inside mt-1 mb-2">
                <li className="text-blue-600 font-semibold">{existingTable.primaryPattern} ({existingTable[`${existingTable.primaryPattern.toLowerCase()}Percentage`]}%)</li>
                <li className="text-blue-600 font-semibold">{existingTable.secondaryPattern} ({existingTable[`${existingTable.secondaryPattern.toLowerCase()}Percentage`]}%)</li>
                <li className="text-blue-600 font-semibold">{existingTable.tertiaryPattern} ({existingTable[`${existingTable.tertiaryPattern.toLowerCase()}Percentage`]}%)</li>
              </ul>
            </div>
            <div className="mb-2">
              <strong>ID da análise para Virada de Chave:</strong> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">{analysisRequestId}</span>
            </div>
            <div className="mt-3">
              <strong>URL de Virada de Chave:</strong> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">/analysis/key-turn/{analysisRequestId}</span>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <CardFooter className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="text-sm text-slate-500">
          {existingTable ? (
            <div>
              <div>Última atualização: {new Date(existingTable.updatedAt).toLocaleString()}</div>
              <div className="mt-1 font-semibold">ID da análise: {analysisRequestId}</div>
            </div>
          ) : "Nova tabela"}
        </div>
        
        {!readonly && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCalculateTotals}
              disabled={!existingTable?.id || calculating}
            >
              {calculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
              Recalcular Totais
            </Button>
            
            <Button 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Tabela
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}