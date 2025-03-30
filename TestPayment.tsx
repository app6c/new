import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import StripeCheckout from '@/components/EmotionalAnalysis/StripeCheckout';

const TestPayment: React.FC = () => {
  const [requestId, setRequestId] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!requestId.trim()) {
      toast({
        title: "ID necessário",
        description: "Por favor, insira um ID de análise válido.",
        variant: "destructive",
      });
      return;
    }
    
    setShowCheckout(true);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <h1 className="text-3xl font-bold text-center mb-8">Teste de Pagamento</h1>
      
      {!showCheckout ? (
        <Card>
          <CardHeader>
            <CardTitle>Testar Checkout do Stripe</CardTitle>
            <CardDescription>
              Insira um ID de análise existente para testar o checkout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="requestId">ID da Análise</Label>
                <Input 
                  id="requestId" 
                  value={requestId} 
                  onChange={(e) => setRequestId(e.target.value)}
                  placeholder="Ex: 2933aa36-47bc-4302-854d-c6bacc6183cd"
                />
                <p className="text-sm text-slate-500">
                  Insira o UUID da análise (não o ID numérico).
                </p>
              </div>
              
              <Button type="submit" className="w-full">
                Iniciar Checkout
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <Button 
            variant="outline" 
            onClick={() => setShowCheckout(false)}
            className="mb-4"
          >
            Voltar
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle>Checkout para Análise</CardTitle>
              <CardDescription>
                ID da análise: {requestId}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StripeCheckout requestId={requestId} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TestPayment;