
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  useSidebar
} from '@/components/ui/sidebar';
import {
  LogOut,
  Settings,
  FileText,
  Eye,
  PanelLeft,
  FileCode,
  Wifi,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const CustomSidebarTrigger = () => {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 md:hidden"
      onClick={() => toggleSidebar()}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading: loading } = useUser();
  
  // Lógica de restrição de rede (Wi-Fi)
  const [isNetworkAuthorized, setIsNetworkAuthorized] = React.useState<boolean>(true);
  const [checkingNetwork, setCheckingNetwork] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  React.useEffect(() => {
    async function checkNetwork() {
      const savedIp = localStorage.getItem('authorized_wifi_ip');
      const isRestrictionActive = localStorage.getItem('wifi_restriction_active') === 'true';

      if (!isRestrictionActive || !savedIp) {
        setIsNetworkAuthorized(true);
        setCheckingNetwork(false);
        return;
      }

      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        setIsNetworkAuthorized(data.ip === savedIp);
      } catch (error) {
        console.error("Erro ao validar rede:", error);
        // Em caso de erro na API de IP, permitimos o acesso mas avisamos no console
        setIsNetworkAuthorized(true);
      } finally {
        setCheckingNetwork(false);
      }
    }
    
    if (user) {
      checkNetwork();
    }
  }, [user, pathname]); // Re-valida ao mudar de página ou login


  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  const menuItems = [
    {
      href: '/dashboard/production-registry',
      label: 'Registro de Produção',
      icon: FileText,
    },
    {
      href: '/dashboard/programming',
      label: 'Programação',
      icon: FileCode,
    },
    {
        href: '/dashboard/records',
        label: 'Visão Supervisor',
        icon: Eye,
    },
    {
      href: '/dashboard/settings',
      label: 'Configurações',
      icon: Settings,
    },
  ];
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'UR';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="rounded-full">
          <Avatar>
            <AvatarImage src={"https://pravatar.cc/100?img=3"} data-ai-hint="female avatar" alt={user?.displayName ?? "User"} />
            <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
          </Avatar>
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{user?.displayName || 'Minha Conta'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">Configurações</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
         <DropdownMenuItem onClick={handleLogout}>
            Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const UserMenuFooter = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          className="justify-start"
          tooltip="Configurações do Usuário"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={"https://pravatar.cc/100?img=3"} data-ai-hint="female avatar" alt={user?.displayName ?? "User"} />
            <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{user?.displayName || 'Usuário'}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mb-2 ml-2">
        <DropdownMenuLabel>{user?.displayName || 'Minha Conta'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Tela de bloqueio de rede
  if (!checkingNetwork && !isNetworkAuthorized && pathname !== '/dashboard/settings') {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="h-20 w-20 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-muted-foreground max-w-md mb-6">
          Este aplicativo está configurado para funcionar apenas na rede Wi-Fi autorizada da empresa. 
          Sua rede atual não possui permissão de acesso.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => window.location.reload()}>Tentar Novamente</Button>
          <Button asChild><Link href="/dashboard/settings">Ir para Configurações</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <UserMenuFooter />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <CustomSidebarTrigger />
          <div className="flex-1 px-4">
             {checkingNetwork && (
               <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground animate-pulse">
                 <Wifi className="h-3 w-3" /> VERIFICANDO REDE...
               </div>
             )}
          </div>
          <div className="flex items-center gap-4">
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
