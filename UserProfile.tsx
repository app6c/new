import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Mail, Calendar, Phone, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { isMobileDevice, mobileAuthRequest } from '@/lib/mobileAuth';

interface UserProfileProps {
  userId?: string;
}

const UserProfile = ({ userId }: UserProfileProps) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProfilePage, setIsProfilePage] = useState(false);
  
  useEffect(() => {
    // Verificar se estamos na rota /profile
    setIsProfilePage(window.location.pathname === '/profile');
  }, []);
  
  // Extrair o id do URL se não for fornecido como prop
  const id = userId || (isProfilePage ? undefined : window.location.pathname.split('/').pop());
  
  // Se estivermos na página de perfil, vamos buscar os dados do usuário logado
  const { data: currentUser, isLoading: isLoadingCurrentUser, error: currentUserError } = useQuery({
    queryKey: ['/api/me'],
    queryFn: async () => {
      console.log('Buscando dados do usuário...');
      try {
        const fetchFn = isMobileDevice() ? mobileAuthRequest : apiRequest;
        const data = await fetchFn("GET", "/api/me");
        console.log('📱 Dados do usuário mobile obtidos:', data);
        return data;
      } catch (error) {
        console.error('📱 Erro de autenticação');
        console.warn(`📱 Tentativa 1: Erro 401 em /api/me`);
        throw error;
      }
    },
    retry: 3,
    retryDelay: attempt => Math.min(attempt > 1 ? 3000 : 1000, 30 * 1000),
    enabled: isProfilePage,
  });
  
  // Se não estamos na página de perfil, buscamos os dados pelo ID normal
  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: [`/api/users/${id}`],
    queryFn: async () => {
      try {
        return await apiRequest("GET", `/api/users/${id}`);
      } catch (error) {
        console.error(`Erro ao buscar detalhes do usuário ${id}:`, error);
        throw error;
      }
    },
    enabled: !!id && !isProfilePage, // Só fazer a consulta se tivermos um ID e não estivermos na página de perfil
  });
  
  // Combinar os resultados
  const userData = isProfilePage ? currentUser : user;
  const isLoading = isProfilePage ? isLoadingCurrentUser : isLoadingUser;
  const error = isProfilePage ? currentUserError : userError;

  // Formatação de data para exibição amigável
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Não informado";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch (e) {
      return dateString;
    }
  };

  // Formatação da última entrada no sistema
  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (e) {
      return dateString;
    }
  };

  // Formatação do status para exibição com cor apropriada
  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return <Badge variant="success">Ativo</Badge>;
    } else {
      return <Badge variant="destructive">Inativo</Badge>;
    }
  };

  // Voltar para a lista de usuários
  const handleBackClick = () => {
    setLocation('/analyst/users');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    toast({
      title: "Erro ao carregar perfil",
      description: "Não foi possível obter os dados do usuário.",
      variant: "destructive"
    });
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-2xl font-bold">Erro ao carregar perfil do usuário</h2>
        <Button onClick={handleBackClick}>Voltar</Button>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-2xl font-bold">Usuário não encontrado</h2>
        <Button onClick={() => setLocation('/')}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => isProfilePage ? setLocation('/') : handleBackClick()} 
          className="mr-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Perfil do Usuário</h1>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold">{userData.fullName || userData.username}</CardTitle>
              <CardDescription>Nome de usuário: {userData.username}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(userData.status)}
              <Badge variant="outline">{userData.role === "admin" ? "Administrador" : "Cliente"}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações Pessoais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-muted-foreground" />
                  <Label>Nome Completo</Label>
                </div>
                <p className="text-sm">{userData.fullName || "Não informado"}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-muted-foreground" />
                  <Label>Email</Label>
                </div>
                <p className="text-sm">{userData.email || "Não informado"}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                  <Label>Data de Nascimento</Label>
                </div>
                <p className="text-sm">{formatDate(userData.birthDate)}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-muted-foreground" />
                  <Label>Telefone</Label>
                </div>
                <p className="text-sm">{userData.phone || "Não informado"}</p>
              </div>
            </div>
          </div>

          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações do Sistema</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                  <Label>Criado em</Label>
                </div>
                <p className="text-sm">{formatDate(userData.createdAt)}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                  <Label>Último acesso</Label>
                </div>
                <p className="text-sm">{formatLastLogin(userData.lastLogin)}</p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-t px-6 py-4 flex justify-between">
          <Button variant="outline" onClick={() => isProfilePage ? setLocation('/') : handleBackClick()}>
            Voltar
          </Button>
          {!isProfilePage && (
            <Button variant="outline" onClick={() => setLocation(`/analyst/users/edit/${id}`)} disabled>
              Editar Perfil
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default UserProfile;