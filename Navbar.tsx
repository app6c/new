import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, User, MenuIcon, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const { user, logoutMutation } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 w-full">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 md:gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-primary">AE7C</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            {user && (
              <>
                <Link href="/" className="font-medium transition-colors hover:text-primary">
                  Início
                </Link>
                {user.username === "analista" && (
                  <>
                    <Link href="/analyst/analyses" className="font-medium transition-colors hover:text-primary">
                      Análises
                    </Link>
                  </>
                )}
                {user.username !== "analista" && (
                  <Link href="/my-analyses" className="font-medium transition-colors hover:text-primary">
                    Minhas Análises
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.username}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/auth">
                <Button variant="outline">Entrar</Button>
              </Link>
              <Link href="/auth">
                <Button>Cadastre-se</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <MenuIcon className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[240px] sm:w-[300px]">
            <div className="px-2 py-6 flex flex-col h-full">
              <Link href="/" className="mb-6 flex items-center" onClick={() => setOpen(false)}>
                <span className="text-xl font-bold text-primary">AE7C</span>
              </Link>
              <nav className="flex flex-col gap-4 flex-1">
                {user && (
                  <>
                    <Link 
                      href="/" 
                      className="flex items-center py-2 text-lg font-semibold hover:text-primary"
                      onClick={() => setOpen(false)}
                    >
                      Início
                    </Link>
                    {user.username === "analista" && (
                      <>
                        <Link 
                          href="/analyst/analyses" 
                          className="flex items-center py-2 text-lg font-semibold hover:text-primary"
                          onClick={() => setOpen(false)}
                        >
                          Análises
                        </Link>
                      </>
                    )}
                    {user.username !== "analista" && (
                      <Link 
                        href="/my-analyses" 
                        className="flex items-center py-2 text-lg font-semibold hover:text-primary"
                        onClick={() => setOpen(false)}
                      >
                        Minhas Análises
                      </Link>
                    )}
                    <Link 
                      href="/profile" 
                      className="flex items-center py-2 text-lg font-semibold hover:text-primary"
                      onClick={() => setOpen(false)}
                    >
                      Perfil
                    </Link>
                    <button 
                      onClick={() => {
                        handleLogout();
                        setOpen(false);
                      }}
                      className="mt-auto flex items-center py-2 text-lg font-semibold text-destructive hover:opacity-80"
                    >
                      <LogOut className="mr-2 h-5 w-5" />
                      Sair
                    </button>
                  </>
                )}
                {!user && (
                  <>
                    <div className="mt-auto flex flex-col gap-3">
                      <Link href="/auth" onClick={() => setOpen(false)}>
                        <Button className="w-full justify-center" variant="default" size="lg">
                          Cadastre-se
                        </Button>
                      </Link>
                      <Link href="/auth" onClick={() => setOpen(false)}>
                        <Button className="w-full justify-center" variant="outline" size="lg">
                          Entrar
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}