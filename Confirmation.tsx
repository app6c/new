import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import StripeCheckout from '@/components/EmotionalAnalysis/StripeCheckout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, DollarSign, Check } from 'lucide-react';

interface ConfirmationProps {
  requestId: string;
}

const Confirmation: React.FC<ConfirmationProps> = ({ requestId }) => {
  const [, navigate] = useLocation();
  const [showCheckout, setShowCheckout] = useState(false);
  
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Informações para Análise enviadas com sucesso!</h2>
        <p className="text-slate-600">
          Recebemos suas informações e suas fotos com sucesso!<br />
          Agora, complete o pagamento para que nossa equipe possa iniciar a análise completa.
        </p>
      </div>

      {!showCheckout ? (
        <Card className="border-primary/20 shadow-md mb-8">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardTitle className="text-xl flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Análise Emocional 6 Camadas
            </CardTitle>
            <CardDescription>
              Oferta especial: $97.00 <span className="line-through text-slate-400">$497.00</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <h3 className="text-amber-800 font-medium text-sm mb-1">Oferta por tempo limitado!</h3>
              <p className="text-amber-700 text-xs">
                De $497 por apenas $97 - Economize $400 (80% de desconto)
              </p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-start">
                <div className="bg-primary/10 rounded-full p-2 mr-3 flex-shrink-0">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-slate-700">Um relatório exclusivo e personalizado</p>
                  <p className="text-sm text-slate-500">Com base na sua análise corporal e emocional</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-primary/10 rounded-full p-2 mr-3 flex-shrink-0">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-slate-700">Um guia estratégico</p>
                  <p className="text-sm text-slate-500">Com orientações práticas para lidar com bloqueios</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-primary/10 rounded-full p-2 mr-3 flex-shrink-0">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-slate-700">Dicas personalizadas</p>
                  <p className="text-sm text-slate-500">Para relacionamentos, carreira e bem-estar emocional</p>
                </div>
              </div>
            </div>
            
            <Button
              className="w-full bg-[#FF7D54] hover:bg-[#e86642] text-white font-medium py-3 text-lg"
              onClick={() => setShowCheckout(true)}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Realizar Pagamento
            </Button>
            
            <div className="mt-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-slate-600">Pagamento 100% seguro via Stripe</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/20 shadow-md mb-8">
          <CardHeader>
            <CardTitle>Finalizar Pagamento</CardTitle>
            <CardDescription>
              Complete seu pagamento para prosseguir com a análise
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requestId && <StripeCheckout requestId={requestId} />}
          </CardContent>
        </Card>
      )}

      <div className="bg-green-50 border border-green-100 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-green-800 text-lg mb-4">Análise concluída com sucesso!</h3>
        <p className="text-green-700 mb-6">
          Seu ID de análise: <span className="font-mono font-bold">{requestId}</span>
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => navigate('/')}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2"
          >
            Voltar ao início
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => navigate('/thank-you/' + requestId)}
            className="border-primary text-primary hover:bg-primary/10 px-6 py-2"
          >
            Ver detalhes da análise
          </Button>
        </div>
      </div>
      
      <div className="text-center text-sm text-slate-500">
        Você receberá sua análise completa em até 24 horas após o pagamento ser confirmado.
      </div>
    </div>
  );
};

export default Confirmation;
