// Esta função registra o Service Worker para habilitar recursos PWA
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registrado com sucesso:', registration);
        })
        .catch(error => {
          console.error('Falha ao registrar Service Worker:', error);
        });
    });
  }
}

// Esta função checa se o dispositivo suporta instalação de PWA
export function checkPwaInstallable() {
  let deferredPrompt: any;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    // Previne que o navegador mostre o prompt automaticamente
    e.preventDefault();
    
    // Armazena o evento para usar depois
    deferredPrompt = e;
    
    // Atualiza UI para mostrar ao usuário que ele pode adicionar à tela inicial
    // Por exemplo, você poderia mostrar um botão aqui
    
    // Você pode adicionar código para mostrar um botão de instalação
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'block';
      
      installButton.addEventListener('click', () => {
        // Mostra o prompt de instalação
        deferredPrompt.prompt();
        
        // Espera o usuário responder ao prompt
        deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('Usuário aceitou a instalação');
          } else {
            console.log('Usuário recusou a instalação');
          }
          
          // Limpa o prompt salvo, pode ser usado apenas uma vez
          deferredPrompt = null;
          
          // Esconde o botão após a interação
          if (installButton) {
            installButton.style.display = 'none';
          }
        });
      });
    }
  });
  
  // Detecta quando o app foi instalado com sucesso
  window.addEventListener('appinstalled', () => {
    console.log('Aplicativo instalado com sucesso');
    // Esconde o botão de instalação, se ainda estiver visível
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  });
}