'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Skeleton } from '@/components/ui/skeleton';

const CustomSidebarTrigger = () => {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10"
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
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

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
      label: 'AI Maintenance',
      icon: BrainCircuit,
    },
  ];

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="rounded-full">
          <Avatar>
            <AvatarImage src="https://picsum.photos/seed/user-avatar/100/100" data-ai-hint="user avatar" alt="User" />
            <AvatarFallback>UR</AvatarFallback>
          </Avatar>
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
         <DropdownMenuItem asChild>
          <Link href="/login">
            Log out
          </Link>
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
            <AvatarImage src="https://picsum.photos/seed/user-avatar/100/100" data-ai-hint="user avatar" alt="User" />
            <AvatarFallback>UR</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">User</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mb-2 ml-2">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/login">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </Link>
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
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <CustomSidebarTrigger />
          <div className="flex-1">
             {/* Can add page title or search bar here */}
          </div>
          {isClient ? <UserMenu /> : <UserMenuPlaceholder />}
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
