import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ThankYou from "@/pages/ThankYou";
import AnalysisScoring from "@/pages/AnalysisScoring";
import AnalysisResult from "@/pages/AnalysisResult";
import AnalysisKeyTurn from "@/pages/AnalysisKeyTurn";
import MyAnalyses from "@/pages/MyAnalyses";
import AdminAnalyses from "@/pages/AdminAnalyses";
import AuthPage from "@/pages/AuthPage";
import TestPayment from "@/pages/TestPayment";
import PaymentPage from "@/pages/PaymentPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/thank-you/:requestId" component={ThankYou} />
      <Route path="/test-payment" component={TestPayment} />
      <ProtectedRoute path="/payment/:requestId" component={PaymentPage} />
      <ProtectedRoute path="/my-analyses" component={MyAnalyses} />
      <ProtectedRoute path="/analyst/analyses" component={AdminAnalyses} adminOnly={true} />
      <ProtectedRoute path="/analyst/analysis/:id" component={AdminAnalyses} adminOnly={true} />
      <ProtectedRoute path="/analysis/scoring/:analysisId" component={AnalysisScoring} adminOnly={true} />
      <Route path="/analysis/result/:requestId" component={AnalysisResult} />
      <ProtectedRoute path="/analysis/key-turn/:id" component={AnalysisKeyTurn} adminOnly={true} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout>
        <Router />
      </AppLayout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
