import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  User, MoreHorizontal, Search, UserCog, Eye, 
  ArrowUpDown, CheckCircle2, XCircle, X, Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Criar um componente para a Badge de filtro
interface FilterBadgeProps {
  label: string;
  value: string;
  onClear: () => void;
}

const FilterBadge = ({ label, value, onClear }: FilterBadgeProps) => {
  return (
    <Badge variant="outline" className="mr-2 mb-2">
      <span className="mr-1 text-gray-500">{label}:</span> {value}
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
        onClick={onClear}
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
};

const UserManagement = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Estado para filtros
  const [usernameFilter, setUsernameFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Estados para os filtros de entrada
  const [usernameInput, setUsernameInput] = useState('');
  
  // Consulta para obter dados de usuários
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/users', usernameFilter, roleFilter, statusFilter],
    queryFn: async () => {
      // Construir queries dinâmicos com base nos filtros
      let url = '/api/users';
      const params = new URLSearchParams();
      
      if (usernameFilter) params.append('username', usernameFilter);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      const queryString = params.toString();
      if (queryString) {
        url += '?' + queryString;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Erro ao buscar usuários');
      }
      return response.json();
    }
  });

  // Formatação de tempo desde a última atividade
  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (e) {
      return dateString;
    }
  };

  // Manipulação de filtros
  const applyUsernameFilter = () => {
    if (usernameInput.trim()) {
      setUsernameFilter(usernameInput.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyUsernameFilter();
    }
  };

  // Limpar filtros individuais
  const clearUsernameFilter = () => {
    setUsernameFilter('');
    setUsernameInput('');
  };

  const clearRoleFilter = () => {
    setRoleFilter('');
  };

  const clearStatusFilter = () => {
    setStatusFilter('');
  };

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setUsernameFilter('');
    setUsernameInput('');
    setRoleFilter('');
    setStatusFilter('');
  };

  // Mostrar usuário
  const viewUser = (userId: number) => {
    setLocation(`/analyst/users/${userId}`);
  };

  // Alterar status do usuário (para implementação futura)
  const toggleUserStatus = async (userId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      // Aqui implementaremos a chamada para atualizar o status
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar status do usuário');
      }
      
      // Atualizar a lista de usuários
      refetch();
      
      toast({
        title: "Status atualizado",
        description: `Usuário agora está ${newStatus === 'active' ? 'ativo' : 'inativo'}.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível alterar o status do usuário.",
        variant: "destructive"
      });
    }
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = usernameFilter || roleFilter || statusFilter;
  
  if (error) {
    toast({
      title: "Erro ao carregar usuários",
      description: "Não foi possível obter a lista de usuários.",
      variant: "destructive"
    });
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Gerenciamento de Usuários</CardTitle>
              <CardDescription>
                Visualize e gerencie todos os usuários do sistema
              </CardDescription>
            </div>
            <Button onClick={() => setLocation('/analyst/users/new')} disabled>
              <User className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Seção de filtros */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Filtrar por nome de usuário..."
                    className="pl-8"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Função
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filtrar por função</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setRoleFilter('admin')}>
                      <UserCog className="mr-2 h-4 w-4" />
                      Administrador
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRoleFilter('client')}>
                      <User className="mr-2 h-4 w-4" />
                      Cliente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filtrar por status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      Ativo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                      <XCircle className="mr-2 h-4 w-4 text-red-500" />
                      Inativo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="ghost" 
                  onClick={applyUsernameFilter}
                  className="hidden md:flex"
                >
                  Aplicar
                </Button>
                
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    onClick={clearAllFilters}
                    className="text-red-500 hover:text-red-700"
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>
            
            {/* Filtros aplicados */}
            {hasActiveFilters && (
              <div className="flex flex-wrap mt-2">
                <div className="mr-2 text-sm text-muted-foreground">Filtros aplicados:</div>
                {usernameFilter && (
                  <FilterBadge 
                    label="Usuário" 
                    value={usernameFilter} 
                    onClear={clearUsernameFilter} 
                  />
                )}
                {roleFilter && (
                  <FilterBadge 
                    label="Função" 
                    value={roleFilter === 'admin' ? 'Administrador' : 'Cliente'} 
                    onClear={clearRoleFilter} 
                  />
                )}
                {statusFilter && (
                  <FilterBadge 
                    label="Status" 
                    value={statusFilter === 'active' ? 'Ativo' : 'Inativo'} 
                    onClear={clearStatusFilter} 
                  />
                )}
              </div>
            )}
          </div>
          
          {/* Tabela de usuários */}
          <div className="rounded-md border">
            <Table>
              <TableCaption>Lista de usuários no sistema</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    <div className="flex items-center">
                      Nome de Usuário
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-red-500">
                      Erro ao carregar usuários. Tente novamente.
                    </TableCell>
                  </TableRow>
                ) : users?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.fullName || '-'}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                          {user.role === 'admin' ? 'Administrador' : 'Cliente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'success' : 'destructive'}>
                          {user.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatLastActivity(user.lastLogin)}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => viewUser(user.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Perfil
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => toggleUserStatus(user.id, user.status)}
                              >
                                {user.status === 'active' ? (
                                  <>
                                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                    Desativar
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                    Ativar
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 ml-2"
                                onClick={() => viewUser(user.id)}
                              >
                                <span className="sr-only">Ver perfil</span>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver perfil</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;