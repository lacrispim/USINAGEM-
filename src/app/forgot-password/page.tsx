'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import { Logo } from '@/components/logo';
import { useAuth } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
        toast({
            title: 'Erro de Autenticação',
            description: 'O serviço de autenticação não está disponível.',
            variant: 'destructive',
        });
        return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'E-mail de redefinição enviado',
        description: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.',
      });
      router.push('/login');
    } catch (error: any) {
        let errorMessage = 'Ocorreu um erro ao enviar o e-mail de redefinição.';
         if (error.code === 'auth/user-not-found') {
            // We don't want to reveal if a user exists or not
             errorMessage = 'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.';
             toast({
                title: 'E-mail de redefinição enviado',
                description: errorMessage,
             });
             router.push('/login');
        } else {
             toast({
                title: 'Erro',
                description: errorMessage,
                variant: 'destructive',
            });
        }
      console.error('Error sending password reset email: ', error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="space-y-4">
          <Logo className="justify-center" />
          <div className="text-center">
            <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
            <CardDescription>
              Digite seu e-mail para receber um link de redefinição.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Enviar E-mail de Redefinição
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Lembrou sua senha?{' '}
            <Link href="/login" className="underline">
              Fazer Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
