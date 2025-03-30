import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { AnalysisFormData, FormStep, AnalysisRequestResponse } from '@/types';
import { ProgressTracker } from './';
import InitialQuestionnaire from './InitialQuestionnaire';
import PhotoUpload from './PhotoUpload';
import PriorityQuestionnaire from './PriorityQuestionnaire';
import SubmitForAnalysis from './SubmitForAnalysis';
import Confirmation from './Confirmation';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';

// Interface para a resposta da API
interface AnalysisRequestAPIResponse {
  requestId: string;
  status: string;
}

// Validation schema
const analysisFormSchema = z.object({
  // Step 1 - Initial Questionnaire
  analysisFor: z.enum(['myself', 'other']),
  otherReason: z.string().optional()
    .refine(value => value !== undefined && value.trim() !== '' || value === undefined, {
      message: 'O motivo é obrigatório quando a análise é para outra pessoa',
      path: ['otherReason']
    }),
  hadSurgery: z.boolean(),
  surgeryDetails: z.string().optional()
    .refine(value => value !== undefined && value.trim() !== '' || value === undefined, {
      message: 'Detalhe a cirurgia',
      path: ['surgeryDetails']
    }),
  hadTrauma: z.boolean(),
  traumaDetails: z.string().optional()
    .refine(value => value !== undefined && value.trim() !== '' || value === undefined, {
      message: 'Detalhe o trauma',
      path: ['traumaDetails']
    }),
  usedDevice: z.boolean(),
  deviceDetails: z.string().optional()
    .refine(value => value !== undefined && value.trim() !== '' || value === undefined, {
      message: 'Detalhe o aparelho usado',
      path: ['deviceDetails']
    }),
  
  // Step 2 - Photo Upload (obrigatórias para análise)
  frontBodyPhoto: z.string().min(1, 'Foto frontal do corpo é obrigatória'),
  backBodyPhoto: z.string().min(1, 'Foto das costas é obrigatória'),
  seriousFacePhoto: z.string().min(1, 'Foto do rosto sério é obrigatória'),
  smilingFacePhoto: z.string().min(1, 'Foto do rosto sorrindo é obrigatória'),
  
  // Step 3 - Priority Questionnaire
  priorityArea: z.enum(['health', 'relationships', 'professional']),
  complaint1: z.string().min(1, 'Pelo menos uma queixa é obrigatória'),
  complaint2: z.string().optional(),
  complaint3: z.string().optional(),
})
.refine((data) => {
  if (data.analysisFor === 'other' && (!data.otherReason || data.otherReason.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'O motivo é obrigatório quando a análise é para outra pessoa',
  path: ['otherReason']
})
.refine((data) => {
  if (data.hadSurgery && (!data.surgeryDetails || data.surgeryDetails.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Detalhe a cirurgia',
  path: ['surgeryDetails']
})
.refine((data) => {
  if (data.hadTrauma && (!data.traumaDetails || data.traumaDetails.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Detalhe o trauma',
  path: ['traumaDetails']
})
.refine((data) => {
  if (data.usedDevice && (!data.deviceDetails || data.deviceDetails.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Detalhe o aparelho usado',
  path: ['deviceDetails']
});

const AnalysisForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  // Initialize form with defaults
  const form = useForm<AnalysisFormData>({
    resolver: zodResolver(analysisFormSchema),
    defaultValues: {
      analysisFor: 'myself',
      hadSurgery: false,
      hadTrauma: false,
      usedDevice: false,
      priorityArea: 'health',
      frontBodyPhoto: '',
      backBodyPhoto: '',
      seriousFacePhoto: '',
      smilingFacePhoto: '',
      complaint1: '',
    },
    mode: 'onChange',
  });

  // Step navigation
  const validateAndProceed = async (stepToValidate: FormStep, nextStep: FormStep) => {
    let fieldsToValidate: Array<keyof AnalysisFormData> = [];
    
    // Define fields to validate for each step
    switch (stepToValidate) {
      case 1:
        fieldsToValidate = ['analysisFor', 'hadSurgery', 'hadTrauma', 'usedDevice'];
        if (form.watch('analysisFor') === 'other') fieldsToValidate.push('otherReason');
        if (form.watch('hadSurgery')) fieldsToValidate.push('surgeryDetails');
        if (form.watch('hadTrauma')) fieldsToValidate.push('traumaDetails');
        if (form.watch('usedDevice')) fieldsToValidate.push('deviceDetails');
        break;
      case 2:
        fieldsToValidate = ['frontBodyPhoto', 'backBodyPhoto', 'seriousFacePhoto', 'smilingFacePhoto'];
        break;
      case 3:
        fieldsToValidate = ['priorityArea', 'complaint1'];
        break;
      case 4:
        // When proceeding from step 4 to 5, we submit the form
        await submitForm();
        return;
    }
    
    // Validate specified fields
    const result = await form.trigger(fieldsToValidate as any);
    
    if (result) {
      setCurrentStep(nextStep);
      window.scrollTo(0, 0);
    } else {
      toast({
        title: t('errors.requiredFields'),
        description: t('errors.fillRequiredFields'),
        variant: "destructive",
      });
    }
  };

  // Form submission
  const submitForm = async () => {
    try {
      setIsSubmitting(true);
      
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          title: t('errors.invalidForm'),
          description: t('errors.checkAllFields'),
          variant: "destructive",
        });
        return;
      }
      
      // Verificar se o usuário está autenticado
      if (!user || !user.id) {
        toast({
          title: t('errors.unauthorized'),
          description: t('errors.loginRequired'),
          variant: "destructive",
        });
        return;
      }
      
      const formData = form.getValues();
      
      // Adicionar o ID do usuário aos dados do formulário
      const requestData = {
        ...formData,
        userId: user.id
      };
      
      // Submit the data to the API
      try {
        console.log("Enviando dados para criar nova análise:", { 
          userId: requestData.userId,
          analysisFor: requestData.analysisFor,
          priorityArea: requestData.priorityArea
        });
        
        const response = await apiRequest('POST', '/api/analysis-requests', requestData);
        
        // Verificar se a resposta é um objeto JSON ou uma resposta HTTP
        if (response && typeof response === 'object' && 'requestId' in response) {
          // Resposta já foi convertida para JSON
          const data = response as AnalysisRequestAPIResponse;
          console.log("Resposta da API (JSON):", data);
          
          setRequestId(data.requestId);
          setCurrentStep(5);
          window.scrollTo(0, 0);
        } else if (response && typeof response.json === 'function') {
          // Resposta é um objeto Response
          const data = await response.json() as AnalysisRequestAPIResponse;
          console.log("Resposta da API (Response):", data);
          
          if (data && data.requestId) {
            setRequestId(data.requestId);
            setCurrentStep(5);
            window.scrollTo(0, 0);
          } else {
            throw new Error(t('errors.requestIdNotReturned'));
          }
        } else {
          console.error("Resposta inesperada:", response);
          throw new Error(t('errors.unexpectedResponse'));
        }
      } catch (error) {
        console.error("Erro durante o envio:", error);
        
        // Se for um erro de autenticação, redirecionar para a página de login
        if (error instanceof Error && error.message.includes("401")) {
          toast({
            title: t('errors.sessionExpired'),
            description: t('errors.loginAgain'),
            variant: "destructive",
          });
          
          // Redirecionar para a página de login após 2 segundos
          setTimeout(() => {
            window.location.href = "/auth";
          }, 2000);
          
          return;
        }
        
        throw error;
      }
      
    } catch (error: any) {
      toast({
        title: t('errors.submitError'),
        description: error.message || t('errors.formSubmitError'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Go to previous step
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => (prev - 1) as FormStep);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">{t('analysis.title')}</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          {t('analysis.subtitle')}
        </p>
      </header>

      <ProgressTracker currentStep={currentStep} />

      <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            {currentStep === 1 && (
              <InitialQuestionnaire 
                form={form} 
                onNext={() => validateAndProceed(1, 2)} 
              />
            )}
            
            {currentStep === 2 && (
              <PhotoUpload 
                form={form} 
                onNext={() => validateAndProceed(2, 3)} 
                onPrev={goToPreviousStep} 
              />
            )}
            
            {currentStep === 3 && (
              <PriorityQuestionnaire 
                form={form} 
                onNext={() => validateAndProceed(3, 4)} 
                onPrev={goToPreviousStep} 
              />
            )}
            
            {currentStep === 4 && (
              <SubmitForAnalysis 
                form={form} 
                onNext={() => validateAndProceed(4, 5)} 
                onPrev={goToPreviousStep}
                isSubmitting={isSubmitting}
              />
            )}
            
            {currentStep === 5 && requestId && (
              <Confirmation requestId={requestId} />
            )}
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AnalysisForm;
