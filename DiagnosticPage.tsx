import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { getAuthToken, isMobileDevice, saveAuthToken, saveAuthUser, clearAuthData } from "@/lib/mobileAuth";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Database, Globe2, RefreshCcw, Smartphone, Trash2 } from "lucide-react";
import { MobileTokenGenerator } from "@/components/MobileTokenGenerator";

type ApiResponse = {
  status: number;
  ok: boolean;
  data: any;
  error?: string;
  responseTime: number;
};

const DiagnosticPage = () => {
  const { user, isLoading } = useAuth();
  const [apiUrl, setApiUrl] = useState<string>('/api/me');
  const [method, setMethod] = useState<string>('GET');
  const [requestBody, setRequestBody] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    cookies: document.cookie,
    localStorage: '',
  });
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [isTestingAll, setIsTestingAll] = useState(false);

  // Adicionar mensagem ao log
  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const timestamp = new Date().toLocaleString();
    const prefix = type === 'info' ? '🔍' : type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
    setLogMessages(prev => [`${prefix} [${timestamp}] ${message}`, ...prev]);
  };

  // Limpar log
  const clearLog = () => {
    setLogMessages([]);
  };

  // Testar API
  const testApi = async () => {
    addLog(`Testando: ${apiUrl}`);
    try {
      const startTime = performance.now();
      let data;
      
      try {
        if (method === 'GET') {
          data = await apiRequest(method, apiUrl);
        } else {
          const body = requestBody ? JSON.parse(requestBody) : undefined;
          data = await apiRequest(method, apiUrl, body);
        }
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        setApiResponse({
          status: 200,
          ok: true,
          data,
          responseTime
        });
        
        addLog(`Sucesso (${responseTime}ms): ${JSON.stringify(data).substring(0, 100)}${JSON.stringify(data).length > 100 ? '...' : ''}`, 'success');
      } catch (error: any) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        setApiResponse({
          status: error.message.includes(':') ? parseInt(error.message.split(':')[0]) : 500,
          ok: false,
          data: null,
          error: error.message,
          responseTime
        });
        
        addLog(`Erro (${responseTime}ms): ${error.message}`, 'error');
      }
    } catch (e: any) {
      addLog(`Erro ao processar requisição: ${e.message}`, 'error');
    }
  };

  // Testar todas as APIs importantes
  const testAllApis = async () => {
    setIsTestingAll(true);
    clearLog();
    
    // Informações do dispositivo
    const date = new Date().toLocaleString();
    addLog(`🚀 Iniciando teste de 3 endpoints em ${date}`);
    addLog(`📱 Dispositivo: ${isMobileDevice() ? 'Mobile' : 'Desktop'}`);
    addLog(`🔍 User Agent: ${navigator.userAgent}`);
    addLog(`📏 Tamanho da tela: ${window.innerWidth}x${window.innerHeight}`);
    addLog(`🍪 Cookies: ${document.cookie || 'No cookies'}`);
    
    try {
      const localStorageItems = Object.keys(localStorage);
      if (localStorageItems.length > 0) {
        addLog(`💾 LocalStorage: ${localStorageItems.join(', ')}`);
      } else {
        addLog(`💾 LocalStorage: No localStorage`);
      }
    } catch (e) {
      addLog(`💾 LocalStorage: Error reading localStorage`, 'error');
    }
    
    addLog('-------------------------------------------');
    
    // Testar 3 endpoints essenciais
    await testEndpoint('/api/me');
    await testEndpoint('/api/user-analysis-requests');
    await testEndpoint('/api/all-analysis-requests');
    
    addLog('-------------------------------------------');
    addLog(`🏁 Teste concluído em ${new Date().toLocaleString()}`);
    setIsTestingAll(false);
  };

  // Testar um endpoint específico
  const testEndpoint = async (url: string) => {
    try {
      addLog(`🔍 Testando: ${url}?_t=${Date.now()}&_=${Math.random()}`);
      const startTime = performance.now();
      
      try {
        const data = await apiRequest('GET', url);
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        if (Array.isArray(data) && data.length === 0) {
          addLog(`⚠️ [200] ${url} - Array vazio retornado (${responseTime}ms)`, 'warn');
          addLog(`📦 Resposta: []`);
        } else {
          addLog(`✅ [200] ${url} - Sucesso (${responseTime}ms)`, 'success');
          addLog(`📦 Resposta: ${JSON.stringify(data).substring(0, 100)}${JSON.stringify(data).length > 100 ? '...' : ''}`);
        }
      } catch (error: any) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        const status = error.message.includes(':') ? parseInt(error.message.split(':')[0]) : 500;
        const message = error.message.includes(':') ? error.message.split(':').slice(1).join(':').trim() : error.message;
        
        addLog(`❌ [${status}] ${url} - Falha (${responseTime}ms)`, 'error');
        addLog(`📦 Erro: ${message}`);
      }
    } catch (e: any) {
      addLog(`❌ Erro ao testar ${url}: ${e.message}`, 'error');
    }
  };

  // Verificar token
  const checkToken = () => {
    const token = getAuthToken();
    if (token) {
      addLog(`✅ Token encontrado: ${token.substring(0, 10)}...`, 'success');
    } else {
      addLog(`❌ Nenhum token encontrado`, 'error');
    }
  };

  // Limpar token
  const clearToken = () => {
    clearAuthData();
    addLog(`🗑️ Token e dados do usuário removidos`, 'info');
  };

  // Atualizar informações do dispositivo
  const updateDeviceInfo = () => {
    try {
      const localStorageContent = { ...localStorage };
      setDeviceInfo({
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        cookies: document.cookie,
        localStorage: JSON.stringify(localStorageContent, null, 2),
      });
      addLog(`📱 Informações do dispositivo atualizadas`, 'info');
    } catch (e: any) {
      addLog(`❌ Erro ao atualizar informações do dispositivo: ${e.message}`, 'error');
    }
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Diagnóstico do Sistema</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={updateDeviceInfo}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Atualizar Info
          </Button>
          <Button variant="secondary" size="sm" onClick={testAllApis} disabled={isTestingAll}>
            <Globe2 className="w-4 h-4 mr-2" />
            Testar Todos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="api">
            <TabsList className="w-full">
              <TabsTrigger value="api" className="flex-1">Testar API</TabsTrigger>
              <TabsTrigger value="token" className="flex-1">Tokens</TabsTrigger>
              <TabsTrigger value="device" className="flex-1">Dispositivo</TabsTrigger>
              <TabsTrigger value="user" className="flex-1">Usuário</TabsTrigger>
            </TabsList>
            
            <TabsContent value="api" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Testar API</CardTitle>
                  <CardDescription>
                    Teste diretamente endpoints da API para diagnóstico
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="api-url">URL da API</Label>
                      <Input 
                        id="api-url"
                        value={apiUrl} 
                        onChange={(e) => setApiUrl(e.target.value)} 
                        placeholder="/api/endpoint"
                      />
                    </div>
                    <div>
                      <Label htmlFor="api-method">Método</Label>
                      <select 
                        id="api-method"
                        value={method} 
                        onChange={(e) => setMethod(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                  </div>
                  
                  {method !== 'GET' && (
                    <div>
                      <Label htmlFor="request-body">Corpo da Requisição (JSON)</Label>
                      <Textarea 
                        id="request-body"
                        value={requestBody} 
                        onChange={(e) => setRequestBody(e.target.value)}
                        placeholder='{"key": "value"}'
                        rows={5}
                      />
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button onClick={testApi}>Testar API</Button>
                </CardFooter>
              </Card>
              
              {apiResponse && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      {apiResponse.ok ? (
                        <><CheckCircle className="w-5 h-5 text-green-500 mr-2" /> Sucesso</>
                      ) : (
                        <><AlertCircle className="w-5 h-5 text-red-500 mr-2" /> Erro</>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Status: {apiResponse.status} | Tempo: {apiResponse.responseTime}ms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-md overflow-auto max-h-40 text-sm">
                      {apiResponse.ok
                        ? JSON.stringify(apiResponse.data, null, 2)
                        : apiResponse.error}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="token" className="space-y-4 mt-4">
              <MobileTokenGenerator />

              <Card>
                <CardHeader>
                  <CardTitle>Gerenciamento de Tokens</CardTitle>
                  <CardDescription>
                    Verificar e gerenciar tokens de autenticação móvel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Smartphone className="h-4 w-4" />
                    <AlertTitle>Sistema de Tokens Mobile</AlertTitle>
                    <AlertDescription>
                      Os tokens são salvos no localStorage e permitem autenticação 
                      persistente em dispositivos móveis onde cookies não funcionam corretamente.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label>Token Atual</Label>
                    <div className="text-sm font-mono bg-muted p-2 rounded-md">
                      {getAuthToken() ? getAuthToken()?.substring(0, 15) + '...' : 'Nenhum token encontrado'}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button onClick={checkToken} variant="secondary">
                    Verificar Token
                  </Button>
                  <Button onClick={clearToken} variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar Token
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="device" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Dispositivo</CardTitle>
                  <CardDescription>
                    Detalhes técnicos sobre o dispositivo atual
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Dispositivo</Label>
                    <div className="text-sm bg-muted p-2 rounded-md flex items-center">
                      {isMobileDevice() ? (
                        <><Smartphone className="w-4 h-4 mr-2" /> Dispositivo Móvel</>
                      ) : (
                        <><Database className="w-4 h-4 mr-2" /> Desktop / Laptop</>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>User Agent</Label>
                    <div className="text-sm font-mono bg-muted p-2 rounded-md overflow-auto max-h-40">
                      {deviceInfo.userAgent}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tamanho da Tela</Label>
                    <div className="text-sm font-mono bg-muted p-2 rounded-md">
                      {deviceInfo.screenSize}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Cookies</Label>
                    <div className="text-sm font-mono bg-muted p-2 rounded-md overflow-auto max-h-40">
                      {deviceInfo.cookies || 'Nenhum cookie encontrado'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Local Storage</Label>
                    <div className="text-sm font-mono bg-muted p-2 rounded-md overflow-auto max-h-40">
                      {deviceInfo.localStorage || 'Nenhum item no localStorage'}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={updateDeviceInfo} variant="outline">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Atualizar Informações
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="user" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Usuário</CardTitle>
                  <CardDescription>
                    Detalhes sobre o usuário atualmente autenticado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : user ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>ID do Usuário</Label>
                        <div className="text-sm font-mono bg-muted p-2 rounded-md">
                          {user.id}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Nome de Usuário</Label>
                        <div className="text-sm font-mono bg-muted p-2 rounded-md">
                          {user.username}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Função do Usuário</Label>
                        <div className="text-sm font-mono bg-muted p-2 rounded-md">
                          {user.role === 'admin' ? 'Administrador' : 'Cliente'}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Detalhes Completos</Label>
                        <pre className="text-sm font-mono bg-muted p-2 rounded-md overflow-auto max-h-40">
                          {JSON.stringify(user, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Não Autenticado</AlertTitle>
                      <AlertDescription>
                        Nenhum usuário está autenticado no momento.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Log de Diagnóstico</span>
                <Button variant="ghost" size="sm" onClick={clearLog}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="bg-muted p-4 rounded-md h-[600px] overflow-auto">
                {logMessages.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">
                    O log está vazio. Execute operações para gerar mensagens.
                  </div>
                ) : (
                  <div className="space-y-1 text-sm font-mono">
                    {logMessages.map((message, index) => (
                      <div key={index} className="whitespace-pre-wrap">{message}</div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPage;