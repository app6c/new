import React from 'react';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ThankYou: React.FC = () => {
  const { requestId } = useParams();

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center bg-green-50 border-b border-green-100 rounded-t-lg">
            <div className="mx-auto bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <CardTitle className="text-2xl sm:text-3xl text-green-800">Análise Registrada!</CardTitle>
            <CardDescription className="text-green-700">
              Sua análise emocional está agora em processamento
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">ID da sua solicitação:</h3>
                <p className="font-mono bg-white p-2 rounded border border-blue-100 text-blue-900">{requestId}</p>
                <p className="text-sm text-blue-700 mt-2">
                  Guarde este código para referência futura.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-800">O que acontece agora?</h3>
                <p className="text-slate-600">
                  Nossa equipe de especialistas já começou a trabalhar na sua análise emocional personalizada.
                </p>
                <ul className="space-y-3 mt-4">
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="font-medium text-slate-700">Revisão das informações</span>
                      <p className="text-sm text-slate-600">Estamos analisando todas as informações que você nos forneceu</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="font-medium text-slate-700">Elaboração do relatório</span>
                      <p className="text-sm text-slate-600">Nossa equipe irá preparar seu relatório personalizado</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="font-medium text-slate-700">Entrega via e-mail</span>
                      <p className="text-sm text-slate-600">Você receberá sua análise completa por e-mail em até 24 horas</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row gap-4 w-full">
              <Button asChild className="flex-1 bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200">
                <Link href="/">
                  Voltar para a página inicial
                </Link>
              </Button>
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={() => {
                  console.log("Redirecionando para análise com requestId:", requestId);
                  window.location.href = `/analysis/scoring/${requestId}`;
                }}
              >
                Prosseguir para Análise (Etapa 6)
              </Button>
            </div>
            <p className="text-sm text-slate-500 text-center">
              Se tiver alguma dúvida, entre em contato conosco via e-mail suporte@analiseemocional.com
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ThankYou;
