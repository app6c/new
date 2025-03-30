import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FormField, FormItem, FormControl, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AnalysisFormData, FormStep } from '@/types';
import ToggleableTextField from './ToggleableTextField';

interface InitialQuestionnaireProps {
  form: UseFormReturn<AnalysisFormData>;
  onNext: () => void;
}

const InitialQuestionnaire: React.FC<InitialQuestionnaireProps> = ({ form, onNext }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Etapa 1 – Questionário Inicial</h2>
      <p className="mb-6 text-slate-600">
        Antes de observar o seu corpo, precisamos entender brevemente seu histórico físico e emocional. 
        Isso ajuda a identificar marcas no corpo que revelam impactos emocionais profundos.
      </p>

      {/* Analysis For */}
      <div className="mb-6">
        <p className="font-medium text-slate-700 mb-3">1. Para quem será feita essa análise?*</p>
        
        <FormField
          control={form.control}
          name="analysisFor"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="space-y-2"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="myself" id="for-myself" />
                    <Label htmlFor="for-myself" className="ml-2 cursor-pointer">
                      Para mim mesmo
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="other" id="for-other" />
                    <Label htmlFor="for-other" className="ml-2 cursor-pointer">
                      Para outra pessoa
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {form.watch('analysisFor') === 'other' && (
          <FormField
            control={form.control}
            name="otherReason"
            render={({ field }) => (
              <FormItem className="mt-3">
                <FormLabel className="text-sm text-slate-700">
                  Se outra pessoa, descreva o motivo (sua resposta será analisada):
                </FormLabel>
                <FormControl>
                  <Textarea 
                    rows={3}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Surgery Question */}
      <ToggleableTextField
        title="2. Você já passou por alguma cirurgia (exemplo rosto, estômago, corpo) significativa?"
        radioName="surgery"
        radioBooleanField="hadSurgery"
        textName="surgery-details"
        textField="surgeryDetails"
        textLabel="Se sim, descreva: tipo da cirurgia, ano, e qualquer outro detalhe relevante."
        form={form}
      />

      {/* Trauma Question */}
      <ToggleableTextField
        title="3. Já vivenciou algum evento traumático, guerra que marcou emocionalmente sua vida?"
        radioName="trauma"
        radioBooleanField="hadTrauma"
        textName="trauma-details"
        textField="traumaDetails"
        textLabel="Se sim, descreva: qual foi o evento e quando aconteceu."
        form={form}
      />

      {/* Device Question */}
      <ToggleableTextField
        title="4. Você usa ou já usou algum aparelho ortodôntico, facial ou prótese corporal?"
        radioName="device"
        radioBooleanField="usedDevice"
        textName="device-details"
        textField="deviceDetails"
        textLabel="Se sim, descreva: qual aparelho, onde e por quanto tempo foi utilizado."
        form={form}
      />

      <div className="flex justify-between mt-8">
        <div></div>
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

export default InitialQuestionnaire;
