import React, { useState, useRef, useCallback } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { PhotoType } from '@/types';
import { Button } from '@/components/ui/button';

interface FileUploadFieldProps {
  form: UseFormReturn<any>;
  fieldName: PhotoType;
  title: string;
  description: string;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  form,
  fieldName,
  title,
  description,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const handleFileChange = useCallback((file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      form.setValue(fieldName, result, { shouldValidate: true, shouldDirty: true });
    };
    reader.readAsDataURL(file);
  }, [form, fieldName]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCameraClick = useCallback(() => {
    if (!isCameraActive) {
      // Iniciar a câmera
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }, // Tenta usar a câmera traseira em dispositivos móveis
          audio: false
        })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            mediaStreamRef.current = stream;
            setIsCameraActive(true);
          }
        })
        .catch(err => {
          console.error("Erro ao acessar a câmera: ", err);
          // Fallback para o input de arquivo se a câmera não estiver disponível
          fileInputRef.current?.click();
        });
      } else {
        // Fallback para navegadores que não suportam getUserMedia
        cameraInputRef.current?.click();
      }
    } else {
      // Capturar a foto
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
          // Configurar o canvas para corresponder às dimensões do vídeo
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Desenhar o frame atual do vídeo no canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Converter o canvas para uma string base64 (formato de imagem)
          const imageDataUrl = canvas.toDataURL('image/jpeg');
          
          // Usar a imagem capturada
          setPreview(imageDataUrl);
          form.setValue(fieldName, imageDataUrl, { shouldValidate: true, shouldDirty: true });
          
          // Parar o stream da câmera
          stopCamera();
        }
      }
    }
  }, [isCameraActive, form, fieldName]);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    form.setValue(fieldName, '', { shouldValidate: true, shouldDirty: true });
    stopCamera();
  }, [form, fieldName, stopCamera]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, [handleFileChange]);

  // Limpeza ao desmontar o componente
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <div>
            <FormLabel className="font-medium text-slate-700">{title}</FormLabel>
            <p className="text-sm text-slate-500 mb-3">{description}</p>
          </div>
          
          <FormControl>
            <>
              {preview ? (
                <div className="relative w-full h-48 rounded-md overflow-hidden">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="absolute top-2 right-2 bg-white/70 hover:bg-white/90 rounded-full p-1 transition-colors"
                    aria-label="Remove image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : isCameraActive ? (
                <div className="relative w-full rounded-md overflow-hidden">
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted
                    className="w-full h-48 object-cover rounded-md"
                  />
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2">
                    <Button
                      type="button"
                      onClick={handleCameraClick}
                      variant="default"
                      className="bg-primary hover:bg-primary/90"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Capturar Foto
                    </Button>
                    <Button
                      type="button"
                      onClick={stopCamera}
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-md cursor-pointer transition-colors
                      ${isDragging ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary hover:bg-primary/5'}
                    `}
                    onClick={handleUploadClick}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary mb-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <p className="font-medium">Clique para enviar</p>
                    <p className="text-sm text-slate-500">ou arraste uma imagem</p>
                  </div>
                  
                  <div className="text-center relative">
                    <div className="absolute left-0 right-0 top-1/2 border-t border-slate-200"></div>
                    <span className="relative z-10 inline-block px-4 bg-white text-sm text-slate-500">ou</span>
                  </div>
                  
                  <Button
                    type="button"
                    onClick={handleCameraClick}
                    variant="outline"
                    className="w-full flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    Tirar Foto com a Câmera
                  </Button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />
                  <input type="hidden" {...field} />
                </div>
              )}
            </>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default FileUploadField;
