import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormStep, AnalysisFormData } from '@/types';
import FileUploadField from './FileUploadField';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PhotoUploadProps {
  form: UseFormReturn<AnalysisFormData>;
  onNext: () => void;
  onPrev: () => void;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ form, onNext, onPrev }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Etapa 2 – Envio das Fotos para Análise Corporal</h2>
      <p className="mb-6 text-slate-600">
        Para identificar seu padrão predominante de personalidade, precisamos observar seu formato corporal e expressões faciais.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Front Body Photo */}
        <FileUploadField
          form={form}
          fieldName="frontBodyPhoto"
          title="Corpo Inteiro – Frontal"
          description="De frente, da cabeça aos pés"
        />

        {/* Back Body Photo */}
        <FileUploadField
          form={form}
          fieldName="backBodyPhoto"
          title="Corpo Inteiro – Traseira"
          description="De costas, da cabeça aos pés"
        />

        {/* Serious Face Photo */}
        <FileUploadField
          form={form}
          fieldName="seriousFacePhoto"
          title="Rosto com Expressão Séria"
          description="Olhando para a câmera, sem sorrir"
        />

        {/* Smiling Face Photo */}
        <FileUploadField
          form={form}
          fieldName="smilingFacePhoto"
          title="Rosto com Sorriso Natural"
          description="Sorriso espontâneo, rosto centralizado"
        />
      </div>

      <Alert className="bg-blue-50 border-blue-100 mb-8">
        <h3 className="font-medium text-slate-700 mb-2">Dicas para fotos com melhor qualidade:</h3>
        <AlertDescription>
          <ul className="list-disc pl-5 text-slate-600 space-y-1">
            <li>Use roupas ajustadas (evite roupas largas)</li>
            <li>Fundo neutro e boa iluminação</li>
            <li>Postura natural, sem forçar</li>
            <li>Evite acessórios que cubram o rosto ou corpo</li>
          </ul>
        </AlertDescription>
      </Alert>

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

export default PhotoUpload;
