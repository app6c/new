import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import StripeCheckout from '@/components/EmotionalAnalysis/StripeCheckout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function PaymentPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const [analysisDetails, setAnalysisDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirecionar administradores para a página de análises
  useEffect(() => {
    if (user && user.role === "admin") {
      toast({
        title: "Acesso restrito",
        description: "Administradores não precisam realizar pagamentos. Use a opção 'Aprovar pagamento' na interface de admin.",
        variant: "destructive",
      });
      setLocation("/admin/analyses");
    }
  }, [user, toast, setLocation]);

  // Fetch analysis details
  useEffect(() => {
    const fetchAnalysisDetails = async () => {
      try {
        setLoading(true);
        const res = await apiRequest('GET', `/api/analysis-requests/${requestId}`);
        const data = await res.json();
        
        if (data.status !== 'aguardando_pagamento') {
          // If already paid, show a message
          if (data.status === 'aguardando_analise' || data.status === 'em_analise' || data.status === 'concluido') {
            setError('Esta análise já foi paga. Você pode verificar o status dela em "Minhas Análises".');
          } else if (data.status === 'cancelado') {
            setError('Esta análise foi cancelada. Por favor, crie uma nova análise se desejar prosseguir.');
          } else {
            setError(`Não foi possível processar o pagamento. Status atual: ${data.status}`);
          }
        }
        
        setAnalysisDetails(data);
      } catch (err: any) {
        toast({
          title: "Erro ao obter detalhes da análise",
          description: err.message || "Não foi possível carregar os detalhes da análise",
          variant: "destructive",
        });
        setError("Não foi possível carregar os detalhes da análise");
      } finally {
        setLoading(false);
      }
    };

    if (requestId) {
      fetchAnalysisDetails();
    }
  }, [requestId, toast]);

  // Traduzir área prioritária
  const getPriorityAreaLabel = (area: string) => {
    switch (area) {
      case 'health': return 'Saúde';
      case 'relationships': return 'Relacionamentos';
      case 'professional': return 'Profissional';
      default: return area;
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Skeleton className="h-8 w-1/3 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/my-analyses">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Minhas Análises
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Pagamento da Análise</h1>
          <p className="text-muted-foreground">Complete seu pagamento para iniciar o processo de análise emocional</p>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não foi possível processar o pagamento</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-primary">
                Pagamento Seguro
              </CardTitle>
              <CardDescription>
                Preencha os dados do seu cartão para concluir o pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!analysisDetails || error ? (
                <Alert variant={error ? "destructive" : "default"} className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription>
                    {error || "Não foi possível carregar os detalhes do pagamento"}
                  </AlertDescription>
                </Alert>
              ) : analysisDetails.status === "aguardando_pagamento" ? (
                <StripeCheckout requestId={requestId} />
              ) : (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700">Pagamento já realizado</AlertTitle>
                  <AlertDescription>
                    Esta análise já foi paga e está sendo processada.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Resumo da Análise</CardTitle>
            </CardHeader>
            <CardContent>
              {analysisDetails ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground">ID da Análise</div>
                      <div className="font-medium">#{analysisDetails.id}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-muted-foreground">Área Prioritária</div>
                      <div className="font-medium">{getPriorityAreaLabel(analysisDetails.priorityArea)}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-muted-foreground">Queixa Principal</div>
                      <div className="font-medium">{analysisDetails.complaint1}</div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Valor da Análise:</span>
                        <span className="font-semibold">US$ 97.00</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600 mt-1">
                        <span>Oferta de Lançamento:</span>
                        <span className="font-semibold">-US$ 0.00</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg mt-2">
                        <span>Total:</span>
                        <span>US$ 97.00</span>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Após o pagamento, sua análise será realizada em até 48 horas</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Pagamento 100% seguro via Stripe</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}