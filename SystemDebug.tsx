import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, RotateCcw, Download, Copy } from 'lucide-react';

const SystemDebug = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [endpoints, setEndpoints] = useState<string[]>([
    '/api/me',
    '/api/user-analysis-requests',
    '/api/all-analysis-requests'
  ]);
  const [newEndpoint, setNewEndpoint] = useState('');
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: '',
    screen: '',
    cookies: '',
    localStorage: '',
    isMobile: false
  });

  // Detectar informações do dispositivo
  useEffect(() => {
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    
    // Coletar cookies (nomes apenas, sem valores)
    const cookieNames = document.cookie.split(';')
      .map(c => c.trim().split('=')[0])
      .filter(Boolean);
      
    // Coletar chaves do localStorage
    const localStorageKeys = Object.keys(localStorage).join(', ');
    
    setDeviceInfo({
      userAgent: ua,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      cookies: cookieNames.join(', ') || 'No cookies',
      localStorage: localStorageKeys || 'No localStorage',
      isMobile
    });
  }, []);

  const addEndpoint = () => {
    if (newEndpoint && !endpoints.includes(newEndpoint)) {
      setEndpoints([...endpoints, newEndpoint]);
      setNewEndpoint('');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const downloadLogs = () => {
    const text = logs.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const copyLogs = () => {
    const text = logs.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copiado!",
        description: "Logs copiados para a área de transferência"
      });
    });
  };

  const testEndpoint = async (url: string) => {
    setLoading(true);
    
    try {
      const timestamp = Date.now();
      const randomParam = Math.random();
      
      // Adicionar parâmetros para evitar cache
      const finalUrl = url.includes('?') 
        ? `${url}&_t=${timestamp}&_=${randomParam}` 
        : `${url}?_t=${timestamp}&_=${randomParam}`;
      
      setLogs(prev => [...prev, `🔍 Testando: ${finalUrl}`]);
      
      const startTime = performance.now();
      
      const response = await fetch(finalUrl, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const endTime = performance.now();
      const timeMs = (endTime - startTime).toFixed(0);
      
      // Tentar ler o corpo da resposta
      const text = await response.text();
      
      if (response.ok) {
        try {
          const data = JSON.parse(text);
          
          // Verificar se é array vazio
          if (Array.isArray(data) && data.length === 0) {
            setLogs(prev => [...prev, `⚠️ [${response.status}] ${url} - Array vazio retornado (${timeMs}ms)`]);
          } else {
            setLogs(prev => [...prev, `✅ [${response.status}] ${url} - Sucesso (${timeMs}ms)`]);
          }
          
          // Mostrar resposta em formato mais legível
          const responseStr = JSON.stringify(data, null, 2);
          setLogs(prev => [...prev, `📦 Resposta: ${responseStr.length > 500 ? responseStr.substring(0, 500) + '...' : responseStr}`]);
        } catch (e) {
          setLogs(prev => [...prev, `⚠️ [${response.status}] ${url} - Resposta não é JSON válido (${timeMs}ms)`]);
          setLogs(prev => [...prev, `📦 Resposta: ${text.substring(0, 500)}`]);
        }
      } else {
        setLogs(prev => [...prev, `❌ [${response.status}] ${url} - Falha (${timeMs}ms)`]);
        setLogs(prev => [...prev, `📦 Erro: ${text}`]);
      }
      
    } catch (error) {
      setLogs(prev => [...prev, `💥 Erro ao acessar ${url}: ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      setLoading(false);
    }
  };

  const testAllEndpoints = async () => {
    setLogs(prev => [...prev, `🚀 Iniciando teste de ${endpoints.length} endpoints em ${new Date().toLocaleString()}`]);
    setLogs(prev => [...prev, `📱 Dispositivo: ${deviceInfo.isMobile ? 'Mobile' : 'Desktop'}`]);
    setLogs(prev => [...prev, `🔍 User Agent: ${deviceInfo.userAgent}`]);
    setLogs(prev => [...prev, `📏 Tamanho da tela: ${deviceInfo.screen}`]);
    setLogs(prev => [...prev, `🍪 Cookies: ${deviceInfo.cookies}`]);
    setLogs(prev => [...prev, `💾 LocalStorage: ${deviceInfo.localStorage}`]);
    setLogs(prev => [...prev, '-------------------------------------------']);
    
    for (const endpoint of endpoints) {
      await testEndpoint(endpoint);
    }
    
    setLogs(prev => [...prev, '-------------------------------------------']);
    setLogs(prev => [...prev, `🏁 Teste concluído em ${new Date().toLocaleString()}`]);
  };

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold">Diagnóstico do Sistema</h1>
          <p className="text-muted-foreground">
            Esta ferramenta permite diagnosticar problemas de conexão com a API. Use-a para identificar
            porque as análises não estão aparecendo no seu dispositivo.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Dispositivo</CardTitle>
            <CardDescription>Detalhes sobre seu dispositivo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="font-semibold">Tipo:</div>
              <div>{deviceInfo.isMobile ? 'Mobile' : 'Desktop'}</div>
              
              <div className="font-semibold">Resolução:</div>
              <div>{deviceInfo.screen}</div>
              
              <div className="font-semibold">Cookies:</div>
              <div className="break-all text-xs">{deviceInfo.cookies}</div>
              
              <div className="font-semibold">LocalStorage:</div>
              <div className="break-all text-xs">{deviceInfo.localStorage}</div>
            </div>
            
            <div>
              <p className="font-semibold mb-1">User Agent:</p>
              <p className="text-xs break-all bg-muted p-2 rounded">{deviceInfo.userAgent}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endpoints para Testar</CardTitle>
            <CardDescription>Adicione ou teste endpoints específicos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Adicionar novo endpoint (ex: /api/me)"
                value={newEndpoint}
                onChange={(e) => setNewEndpoint(e.target.value)}
              />
              <Button onClick={addEndpoint} type="button">Adicionar</Button>
            </div>
            
            <div className="space-y-2">
              {endpoints.map((endpoint, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="flex-1 truncate border rounded px-3 py-2">{endpoint}</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => testEndpoint(endpoint)}
                    disabled={loading}
                  >
                    Testar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="default" 
              onClick={testAllEndpoints}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Testar Todos
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Logs de Diagnóstico</CardTitle>
              <CardDescription>Resultados dos testes</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={clearLogs}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Limpar
              </Button>
              <Button variant="outline" size="sm" onClick={copyLogs}>
                <Copy className="h-4 w-4 mr-1" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={downloadLogs}>
                <Download className="h-4 w-4 mr-1" />
                Baixar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              className="font-mono text-xs h-96 bg-black text-green-400 whitespace-pre"
              value={logs.join('\n')}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemDebug;