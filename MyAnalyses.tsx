import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Loader2, FileText, AlertCircle, CheckCircle, 
  Clock, ArrowUpDown, Eye, Clipboard, CreditCard, Trash2
} from "lucide-react";
import { formatDate } from "@/lib/utils";
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [analysisToDelete, setAnalysisToDelete] = useState<number | null>(null);
  const [checkoutAnalysis, setCheckoutAnalysis] = useState<{
    requestId: string;
    details: {
      id: number;
      priorityArea: string;
      complaint1: string;
    };
  } | null>(null);

  const {
    data: analyses,
    isLoading,
    error,
  } = useQuery<AnalysisWithResult[]>({
    queryKey: ["/api/user-analysis-requests"],
    queryFn: async () => {
      try {
        // A apiRequest já retorna o JSON diretamente
        return await apiRequest("GET", "/api/user-analysis-requests");
      } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
        throw new Error("Falha ao buscar análises");
      }
    },
    enabled: !!user,
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
          icon: <Clipboard className="h-4 w-4" />,
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

  // Filtrar análises por status e ordenar por ID (decrescente)
  const filteredAnalyses = Array.isArray(analyses) 
    ? analyses
        .filter((analysis) => {
          return statusFilter === "all" || analysis.status === statusFilter;
        })
        .sort((a, b) => b.id - a.id) // Ordenação decrescente por ID
    : [];

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
          <h1 className="text-3xl font-bold">Minhas Análises</h1>
          <p className="text-muted-foreground">
            Veja o status de todas as suas análises emocionais
          </p>
        </div>
        <Button asChild>
          <Link href="/">Nova Análise</Link>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
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
            Você ainda não tem análises ou não foram encontradas análises com o filtro aplicado.
          </p>
          <Button asChild>
            <Link href="/">Solicitar Nova Análise</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">ID</TableHead>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead>Status</TableHead>
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
                        {/* Botão para pagamento - mostrar apenas se aguardando pagamento */}
                        {analysis.status === "aguardando_pagamento" && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            title="Realizar pagamento" 
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
                            Pagar Agora
                          </Button>
                        )}

                        {/* Botão para visualizar resultado - mostrar para análises concluídas */}
                        {analysis.status === "concluido" && (
                          <Button variant="default" size="sm" asChild title="Ver resultado da análise">
                            <Link href={`/analysis/result/${analysis.requestId}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Resultado
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