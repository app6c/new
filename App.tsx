import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import NovaAnalise from "@/pages/NovaAnalise";
import ThankYou from "@/pages/ThankYou";
import AnalysisScoring from "@/pages/AnalysisScoring";
import AnalysisResult from "@/pages/AnalysisResult";
import AnalysisKeyTurn from "@/pages/AnalysisKeyTurn";
import MyAnalyses from "@/pages/MyAnalyses";
import AdminAnalyses from "@/pages/AdminAnalyses";
import UserManagement from "@/pages/UserManagement";
import UserProfile from "@/pages/UserProfile";
import AuthPage from "@/pages/AuthPage";
import TestPayment from "@/pages/TestPayment";
import PaymentPage from "@/pages/PaymentPage";
import DiagnosticPage from "@/pages/DiagnosticPage";
import SystemDebug from "@/pages/SystemDebug";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import LanguageSelector from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/nova-analise" component={NovaAnalise} />
      <Route path="/thank-you/:requestId" component={ThankYou} />
      <Route path="/test-payment" component={TestPayment} />
      <ProtectedRoute path="/payment/:requestId" component={PaymentPage} />
      <ProtectedRoute path="/my-analyses" component={MyAnalyses} />
      <ProtectedRoute path="/profile" component={UserProfile} />
      <ProtectedRoute path="/analyst/analyses" component={AdminAnalyses} adminOnly={true} />
      <ProtectedRoute path="/analyst/analysis/:id" component={AdminAnalyses} adminOnly={true} />
      <ProtectedRoute path="/analyst/users" component={UserManagement} adminOnly={true} />
      <ProtectedRoute path="/analyst/users/:id" component={UserProfile} adminOnly={true} />
      <ProtectedRoute path="/analysis/scoring/:analysisId" component={AnalysisScoring} adminOnly={true} />
      <Route path="/analysis/result/:requestId" component={AnalysisResult} />
      <ProtectedRoute path="/analysis/key-turn/:id" component={AnalysisKeyTurn} adminOnly={true} />
      <Route path="/diagnostico" component={DiagnosticPage} />
      <Route path="/debug" component={SystemDebug} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Inicializar sistema de tradução
  const { i18n } = useTranslation();
  
  // Efeito para garantir que o idioma seja carregado corretamente em todas as páginas
  useEffect(() => {
    // Verificar se há um idioma salvo no localStorage
    const savedLanguage = localStorage.getItem('language');
    
    // Verificar se acabamos de mudar o idioma (recarregamento da página)
    const justChangedLanguage = sessionStorage.getItem('languageChanged') === 'true';
    if (justChangedLanguage) {
      // Limpar o flag
      sessionStorage.removeItem('languageChanged');
      console.log('Página recarregada após mudança de idioma');
    }
    
    // Garantir que o idioma correto seja aplicado
    if (savedLanguage && savedLanguage !== i18n.language) {
      console.log(`Aplicando idioma salvo: ${savedLanguage}`);
      i18n.changeLanguage(savedLanguage);
    }
    
    // Definir título da página com base no idioma atual
    const updatePageTitle = () => {
      const pageTitle = i18n.language === 'pt' ? 
        'Análise Emocional 6 Camadas' : 
        '6-Layer Emotional Analysis';
      document.title = pageTitle;
    };
    
    // Atualizar o título inicial
    updatePageTitle();
    
    // Escutar alterações de idioma para atualizar títulos dinamicamente
    const handleLanguageChanged = () => {
      updatePageTitle();
      console.log(`Idioma mudou para: ${i18n.language}, atualizando traduções globais`);
    };
    
    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout>
        <Router />
        <LanguageSelector />
      </AppLayout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
