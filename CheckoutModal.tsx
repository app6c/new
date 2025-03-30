import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import StripeCheckout from './StripeCheckout';

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  analysisDetails?: {
    id: number;
    priorityArea: string;
    complaint1: string;
  };
}

// Traduzir área prioritária
const getPriorityAreaLabel = (area: string) => {
  switch (area) {
    case 'health': return 'Saúde';
    case 'relationships': return 'Relacionamentos';
    case 'professional': return 'Profissional';
    default: return area;
  }
};

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onOpenChange,
  requestId,
  analysisDetails
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-2xl font-bold">Checkout Seguro</DialogTitle>
            <DialogDescription>
              Complete seu pagamento para iniciar o processo de análise emocional
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Fechar">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo da análise */}
          {analysisDetails && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h3 className="font-semibold text-lg mb-2">Resumo da Análise</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">ID da Análise:</span>
                  <span className="font-medium">#{analysisDetails.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Área Prioritária:</span>
                  <span className="font-medium">{getPriorityAreaLabel(analysisDetails.priorityArea)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Queixa Principal:</span>
                  <span className="font-medium">{analysisDetails.complaint1}</span>
                </div>
                <div className="border-t border-slate-200 my-2 pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Valor da Análise:</span>
                    <span>US$ 97.00</span>
                  </div>
                  <div className="flex justify-between text-green-600 text-sm">
                    <span>Oferta de Lançamento:</span>
                    <span>-US$ 0.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-1">
                    <span>Total:</span>
                    <span>US$ 97.00</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Checkout do Stripe */}
          <StripeCheckout requestId={requestId} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;