import React from 'react';
import { AnalysisForm } from '@/components/EmotionalAnalysis';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';
import LanguageSelector from '@/components/LanguageSelector';

const NovaAnalise: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <div className="absolute top-4 right-16 z-10">
        <LanguageSelector />
      </div>
      <AnalysisForm />
    </div>
  );
};

export default NovaAnalise;