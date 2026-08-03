'use client';

import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { Wifi, Lock, Unlock, ShieldCheck, Globe } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Estados para restrição de rede
  const [currentIp, setCurrentIp] = useState<string>('Carregando...');
  const [authorizedIp, setAuthorizedIp] = useState<string | null>(null);
  const [isRestrictionActive, setIsRestrictionActive] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
    
    // Carregar configurações de rede salvas
    const savedIp = localStorage.getItem('authorized_wifi_ip');
    const active = localStorage.getItem('wifi_restriction_active') === 'true';
    setAuthorizedIp(savedIp);
    setIsRestrictionActive(active);

    // Buscar IP atual do usuário
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setCurrentIp(data.ip))
      .catch(() => setCurrentIp('Erro ao identificar IP'));

  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    try {
      await updateProfile(user, { displayName });
      toast({
        title: 'Sucesso',
        description: 'Seu perfil foi atualizado.',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar seu perfil. ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleWifiRestriction = (checked: boolean) => {
    if (checked && !authorizedIp) {
      toast({
        title: "Atenção",
        description: "Você precisa autorizar uma rede antes de ativar a restrição.",
        variant: "destructive"
      });
      return;
    }
    setIsRestrictionActive(checked);
    localStorage.setItem('wifi_restriction_active', String(checked));
    toast({
      title: checked ? "Restrição Ativada" : "Restrição Desativada",
      description: checked ? "O app agora só abrirá nesta rede Wi-Fi." : "O acesso está liberado de qualquer rede.",
    });
  };

  const authorizeCurrentNetwork = () => {
    if (currentIp === 'Carregando...' || currentIp.includes('Erro')) return;
    
    setAuthorizedIp(currentIp);
    localStorage.setItem('authorized_wifi_ip', currentIp);
    toast({
      title: "Rede Autorizada",
      description: `O IP ${currentIp} foi registrado como seu Wi-Fi oficial.`,
    });
  };

  if (isUserLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <Card><CardContent className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie seu perfil e a segurança do aplicativo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>
              Estas informações serão exibidas publicamente.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdateProfile}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nome de Exibição</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ''} disabled />
              </div>
            </CardContent>
            <div className="border-t bg-card-foreground/5 px-6 py-4">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className={cn(isRestrictionActive && "border-primary/50 shadow-md transition-all")}>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Wifi className="h-5 w-5" /> 
                        Restrição de Rede (Wi-Fi)
                    </CardTitle>
                    <CardDescription>
                        Limite o uso do app apenas ao Wi-Fi da usinagem.
                    </CardDescription>
                </div>
                <Switch 
                    checked={isRestrictionActive} 
                    onCheckedChange={toggleWifiRestriction} 
                />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 p-4 rounded-lg bg-muted/30 border border-dashed">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <p className="text-xs font-black uppercase text-muted-foreground">Sua Rede Atual (IP)</p>
                        <p className="text-lg font-mono font-bold">{currentIp}</p>
                    </div>
                    <Badge variant={currentIp === authorizedIp ? "default" : "outline"} className="h-6">
                        {currentIp === authorizedIp ? <ShieldCheck className="h-3 w-3 mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
                        {currentIp === authorizedIp ? "REDE AUTORIZADA" : "REDE DESCONHECIDA"}
                    </Badge>
                </div>
                <Button variant="secondary" size="sm" onClick={authorizeCurrentNetwork} className="w-full font-bold">
                    DEFINIR ESTA REDE COMO OFICIAL
                </Button>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full", isRestrictionActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                        {isRestrictionActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </div>
                    <div>
                        <p className="text-sm font-bold">{isRestrictionActive ? "Bloqueio Ativo" : "Acesso Livre"}</p>
                        <p className="text-xs text-muted-foreground">
                            {isRestrictionActive 
                                ? `O sistema está travado para o IP: ${authorizedIp}` 
                                : "Qualquer pessoa com login pode acessar de qualquer lugar."}
                        </p>
                    </div>
                </div>
            </div>

            {isRestrictionActive && (
                 <div className="text-[10px] text-destructive font-bold uppercase p-2 bg-destructive/10 rounded border border-destructive/20">
                    CUIDADO: Se você mudar de rede ou o IP da empresa mudar, você poderá ser bloqueado até que um administrador autorize o novo IP.
                 </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
