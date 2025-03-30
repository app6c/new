import React from 'react';
import { FormStep } from '@/types';

interface ProgressTrackerProps {
  currentStep: FormStep;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Questionário Inicial' },
    { number: 2, label: 'Fotos para Análise' },
    { number: 3, label: 'Questionário de Prioridades' },
    { number: 4, label: 'Enviar para Análise' },
    { number: 5, label: 'Confirmação' },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-3xl mx-auto mb-2">
        {steps.map((step, index) => {
          return (
            <div key={step.number} className="flex items-center flex-1">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors
                  ${currentStep === step.number ? 'bg-primary text-white' : ''}
                  ${currentStep > step.number ? 'bg-primary text-white' : ''}
                  ${currentStep < step.number ? 'bg-slate-200 text-slate-500' : ''}
                `}
              >
                {currentStep > step.number ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div 
                  className={`flex-1 h-0.5 transition-colors
                    ${currentStep > index + 1 ? 'bg-primary' : 'bg-slate-200'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center justify-between max-w-3xl mx-auto text-xs text-slate-500">
        {steps.map((step) => (
          <div 
            key={step.number} 
            className={`text-center transition-colors
              ${currentStep === step.number ? 'text-primary font-medium' : ''}
              ${currentStep > step.number ? 'text-primary' : ''}
            `}
          >
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressTracker;
