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
  BrainCircuit,
  LogOut,
  Settings,
  FileText,
  Eye,
  PanelLeft,
  Wrench
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';

const CustomSidebarTrigger = () => {
  const { toggleSidebar, isMobile } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-10 w-10', isMobile ? 'flex' : 'hidden md:flex')}
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
  const { user, loading } = useUser();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


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
        href: '/dashboard/records',
        label: 'Visão Supervisor',
        icon: Eye,
    },
    {
      href: '/dashboard/ai-recommendations',
      label: 'Manutenção IA',
      icon: BrainCircuit,
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
            <AvatarImage src={user?.photoURL ?? "https://picsum.photos/seed/user-avatar/100/100"} data-ai-hint="user avatar" alt={user?.displayName ?? "User"} />
            <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
          </Avatar>
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{user?.displayName || 'My Account'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
<<<<<<< HEAD
         <DropdownMenuItem onClick={handleLogout}>
=======
         <DropdownMenuItem>
          <Link href="/login">
>>>>>>> 0319ad85957280a0a0e96ba67c65490ec2d3b8c5
            Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const UserMenuFooter = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          className="justify-start"
          tooltip="User Settings"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={user?.photoURL ?? "https://picsum.photos/seed/user-avatar/100/100"} data-ai-hint="user avatar" alt={user?.displayName ?? "User"} />
            <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{user?.displayName || 'User'}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mb-2 ml-2">
        <DropdownMenuLabel>{user?.displayName || 'My Account'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
<<<<<<< HEAD
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
=======
        <DropdownMenuItem>
          <Link href="/login">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </Link>
>>>>>>> 0319ad85957280a0a0e96ba67c65490ec2d3b8c5
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const UserMenuPlaceholder = () => (
     <div className="flex items-center justify-end">
        <Skeleton className="h-10 w-10 rounded-full" />
    </div>
  );
  
  const UserMenuFooterPlaceholder = () => (
    <div className="flex items-center gap-2 p-2">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-4 w-12" />
    </div>
  );
  
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
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
          {isClient ? <UserMenuFooter /> : <UserMenuFooterPlaceholder />}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <CustomSidebarTrigger />
          <div className="flex-1">
             {/* Can add page title or search bar here */}
          </div>
          <div className="flex items-center gap-4">
            {isClient ? <UserMenu /> : <UserMenuPlaceholder />}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
