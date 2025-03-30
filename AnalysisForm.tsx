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
  
  // Step 2 - Photo Upload (opcionais para teste)
  frontBodyPhoto: z.string().optional(),
  backBodyPhoto: z.string().optional(),
  seriousFacePhoto: z.string().optional(),
  smilingFacePhoto: z.string().optional(),
  
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
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
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
          title: "Formulário inválido",
          description: "Por favor, verifique se preencheu todos os campos corretamente.",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar se o usuário está autenticado
      if (!user || !user.id) {
        toast({
          title: "Não autorizado",
          description: "Você precisa estar logado para enviar uma análise.",
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
        const response = await apiRequest('POST', '/api/analysis-requests', requestData);
        const data = await response.json() as AnalysisRequestAPIResponse;
        console.log("Resposta da API:", data);
        
        if (data && data.requestId) {
          setRequestId(data.requestId);
          setCurrentStep(5);
          window.scrollTo(0, 0);
        } else {
          throw new Error("ID da solicitação não retornado pela API");
        }
      } catch (error) {
        console.error("Erro durante o envio:", error);
        throw error;
      }
      
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Ocorreu um erro ao enviar o formulário. Tente novamente.",
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
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">Análise Emocional 6 Camadas</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Descubra seu padrão predominante de personalidade e receba um guia estratégico personalizado para desbloqueio emocional.
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
