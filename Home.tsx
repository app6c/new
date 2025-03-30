import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { AnalysisRequest } from '@shared/schema';
import { ActivitySquare, BarChart3, Clipboard, FileText, LayoutDashboard, Loader2, Settings, Users } from 'lucide-react';

// Dashboard do Cliente
const ClientDashboard: React.FC = () => {
  const { data: analysisRequests, isLoading } = useQuery<AnalysisRequest[]>({
    queryKey: ['/api/user-analysis-requests']
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho com Logo */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img 
              src="/img/method_6_layers_logo.png" 
              alt="Method 6 Layers - Mindset & Emotions" 
              className="h-24 md:h-32 object-contain"
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">
            Análise Emocional <span className="text-primary">6 Camadas</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Descubra seus padrões emocionais e transforme sua vida pessoal, 
            relacionamentos e carreira.
          </p>
        </div>

        {/* Cards de ação */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card Nova Análise */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">Iniciar Nova Análise</CardTitle>
              <CardDescription>
                Responda ao questionário e envie suas fotos para iniciar uma nova análise emocional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Complete todas as etapas do processo de análise, incluindo o envio das fotos 
                necessárias e o pagamento para receber sua análise personalizada.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/nova-analise">
                <Button className="w-full">Iniciar Análise</Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Card Minhas Análises */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">Minhas Análises</CardTitle>
              <CardDescription>
                Visualize suas análises anteriores e acompanhe o status das pendentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {!analysisRequests || analysisRequests.length === 0 
                    ? "Você ainda não possui análises. Inicie uma nova análise para começar."
                    : `Você possui ${analysisRequests.length} análise(s). Clique abaixo para visualizar.`}
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Link href="/my-analyses">
                <Button className="w-full" variant="outline">Ver Minhas Análises</Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Card Informações */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">Sobre a Análise</CardTitle>
              <CardDescription>
                Entenda como funciona a metodologia 6 Camadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                A Análise Emocional 6 Camadas é uma metodologia exclusiva que identifica padrões 
                emocionais através da leitura corporal, oferecendo insights profundos sobre comportamentos e emoções.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="secondary" className="w-full">Saiba Mais</Button>
            </CardFooter>
          </Card>
        </div>

        {/* Depoimentos ou extras */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-2">Transforme sua vida emocional hoje</h2>
          <p className="text-muted-foreground mb-8">
            Descubra como a Análise Emocional 6 Camadas já ajudou milhares de pessoas a 
            entenderem melhor seus padrões emocionais e a alcançarem um equilíbrio saudável.
          </p>
        </div>
      </div>
    </div>
  );
};

// Dashboard do Analista/Admin
const AnalystDashboard: React.FC = () => {
  const { data: analysisRequests, isLoading } = useQuery<AnalysisRequest[]>({
    queryKey: ['/api/all-analysis-requests']
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho com Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <img 
              src="/img/method_6_layers_logo.png" 
              alt="Method 6 Layers - Mindset & Emotions" 
              className="h-20 object-contain"
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Painel do <span className="text-primary">Analista</span>
          </h1>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            Gerencie análises, usuários e visualize estatísticas do sistema
          </p>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-primary/10">
            <CardContent className="p-4 flex flex-col items-center">
              <ActivitySquare className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-bold text-2xl">{isLoading ? '...' : analysisRequests?.length || 0}</h3>
              <p className="text-xs text-muted-foreground">Análises Totais</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10">
            <CardContent className="p-4 flex flex-col items-center">
              <Clipboard className="h-8 w-8 text-yellow-500 mb-2" />
              <h3 className="font-bold text-2xl">
                {isLoading ? '...' : 
                  analysisRequests?.filter(a => a.status === 'aguardando_analise').length || 0}
              </h3>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10">
            <CardContent className="p-4 flex flex-col items-center">
              <BarChart3 className="h-8 w-8 text-blue-500 mb-2" />
              <h3 className="font-bold text-2xl">
                {isLoading ? '...' : 
                  analysisRequests?.filter(a => a.status === 'em_analise').length || 0}
              </h3>
              <p className="text-xs text-muted-foreground">Em Análise</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10">
            <CardContent className="p-4 flex flex-col items-center">
              <FileText className="h-8 w-8 text-green-500 mb-2" />
              <h3 className="font-bold text-2xl">
                {isLoading ? '...' : 
                  analysisRequests?.filter(a => a.status === 'concluido').length || 0}
              </h3>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </CardContent>
          </Card>
        </div>

        {/* Cards principais */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Gerenciar Análises */}
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <LayoutDashboard className="mr-2 h-5 w-5 text-primary" />
                Gerenciar Análises
              </CardTitle>
              <CardDescription>
                Veja todas as análises e acompanhe o status de cada uma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                <li className="flex justify-between text-sm">
                  <span>Análises pendentes de pagamento:</span>
                  <span className="font-medium">
                    {isLoading ? '...' : 
                      analysisRequests?.filter(a => a.status === 'aguardando_pagamento').length || 0}
                  </span>
                </li>
                <li className="flex justify-between text-sm">
                  <span>Análises aguardando início:</span>
                  <span className="font-medium">
                    {isLoading ? '...' : 
                      analysisRequests?.filter(a => a.status === 'aguardando_analise').length || 0}
                  </span>
                </li>
                <li className="flex justify-between text-sm">
                  <span>Análises em processamento:</span>
                  <span className="font-medium">
                    {isLoading ? '...' : 
                      analysisRequests?.filter(a => a.status === 'em_analise').length || 0}
                  </span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/analyst/analyses">
                <Button className="w-full">Ver Todas as Análises</Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Gerenciar Usuários */}
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                Gerenciar Usuários
              </CardTitle>
              <CardDescription>
                Cadastre, edite ou desative usuários do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Gerencie os usuários do sistema, controle o acesso e defina permissões.
                Você pode visualizar o histórico de análises por usuário e gerenciar contas.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/analyst/users">
                <Button className="w-full" variant="outline">Gerenciar Usuários</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Configurações do Sistema */}
        <div className="mt-8">
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5 text-primary" />
                Configurações do Sistema
              </CardTitle>
              <CardDescription>
                Configure os padrões emocionais e outras definições
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ajuste padrões emocionais, valores de áreas, configurações de pagamento e outros 
                parâmetros do sistema.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Componente principal que decide qual dashboard exibir
const Home: React.FC = () => {
  const { user } = useAuth();
  
  const isAnalyst = user?.username === 'analista';
  
  if (isAnalyst) {
    return <AnalystDashboard />;
  }
  
  return <ClientDashboard />;
};

export default Home;
