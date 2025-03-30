import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormControl, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { AnalysisFormData } from '@/types';

interface PriorityQuestionnaireProps {
  form: UseFormReturn<AnalysisFormData>;
  onNext: () => void;
  onPrev: () => void;
}

const PriorityQuestionnaire: React.FC<PriorityQuestionnaireProps> = ({ form, onNext, onPrev }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Etapa 3 – Questionário de Prioridades</h2>
      <p className="mb-6 text-slate-600">
        Agora vamos afunilar sua análise para o que realmente importa pra você nesse momento.
      </p>

      <div className="mb-8">
        <h3 className="font-semibold text-slate-700 mb-4">Parte 1 – Área de Prioridade Atual</h3>
        <p className="mb-4 text-slate-600">Escolha a área da sua vida onde você sente que está mais travado:</p>
        
        <FormField
          control={form.control}
          name="priorityArea"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <div className="grid md:grid-cols-3 gap-4 mt-2">
                <div 
                  className={`flex flex-col h-full p-4 rounded-md border-2 cursor-pointer transition-all ${field.value === 'health' 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => field.onChange('health')}
                >
                  <div className="flex justify-between items-start mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {field.value === 'health' && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-slate-700">Saúde</span>
                  <span className="text-sm text-slate-500 mt-1">Bem-estar físico, mental e emocional</span>
                </div>

                <div 
                  className={`flex flex-col h-full p-4 rounded-md border-2 cursor-pointer transition-all ${field.value === 'relationships' 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => field.onChange('relationships')}
                >
                  <div className="flex justify-between items-start mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    {field.value === 'relationships' && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-slate-700">Relacionamentos Amorosos</span>
                  <span className="text-sm text-slate-500 mt-1">Conexão, autoestima, afetos</span>
                </div>

                <div 
                  className={`flex flex-col h-full p-4 rounded-md border-2 cursor-pointer transition-all ${field.value === 'professional' 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => field.onChange('professional')}
                >
                  <div className="flex justify-between items-start mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {field.value === 'professional' && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-slate-700">Vida Profissional</span>
                  <span className="text-sm text-slate-500 mt-1">Trabalho, propósito, resultados</span>
                </div>
              </div>
              <FormControl>
                <input 
                  type="hidden" 
                  id="priorityArea" 
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="mb-8">
        <h3 className="font-semibold text-slate-700 mb-4">Parte 2 – Queixas Emocionais ou Comportamentais</h3>
        <p className="mb-4 text-slate-600">Escreva até 3 situações que te incomodam ou que você gostaria de mudar:</p>
        
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="complaint1"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-slate-700">Queixa 1 (obrigatória):</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder='Ex: "Tenho dificuldade em dizer o que penso"'
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="complaint2"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-slate-700">Queixa 2 (opcional):</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder='Ex: "Sinto que me saboto quando estou prestes a dar certo"'
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="complaint3"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-slate-700">Queixa 3 (opcional):</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder='Ex: "Me comparo demais e perco o foco"'
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onPrev}
          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Voltar
        </Button>
        <Button 
          type="button" 
          onClick={onNext}
          className="bg-primary text-white hover:bg-primary/90"
        >
          Continuar <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </Button>
      </div>
    </div>
  );
};

export default PriorityQuestionnaire;
