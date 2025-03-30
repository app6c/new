import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const InstallButton = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Previne o comportamento padrão do navegador
      e.preventDefault();
      // Armazena o evento para uso posterior
      setDeferredPrompt(e);
      // Atualiza UI para mostrar botão de instalação
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      // Esconde o botão após a instalação
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('Aplicativo instalado com sucesso!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Mostra o prompt de instalação
    deferredPrompt.prompt();

    // Espera pelo resultado
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Usuário aceitou a instalação');
    } else {
      console.log('Usuário recusou a instalação');
    }

    // Limpa o prompt armazenado
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isInstallable) return null;

  return (
    <Button 
      id="install-button"
      onClick={handleInstallClick}
      variant="default"
      className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-400 hover:from-green-600 hover:to-green-500"
    >
      <Download size={16} /> Instalar App
    </Button>
  );
};

export default InstallButton;