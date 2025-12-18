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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
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
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard/production-registry');
    } catch (error: any) {
        let errorMessage = 'Ocorreu um erro ao fazer login.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = 'E-mail ou senha inválidos.';
        }
        toast({
            title: 'Erro de Login',
            description: errorMessage,
            variant: 'destructive',
        });
      console.error('Error signing in: ', error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="space-y-4">
          <Logo className="justify-center" />
          <div className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Enter your email below to login to your account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
<<<<<<< HEAD
          <form onSubmit={handleLogin}>
=======
          <form>
>>>>>>> 0319ad85957280a0a0e96ba67c65490ec2d3b8c5
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
<<<<<<< HEAD
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
=======
>>>>>>> 0319ad85957280a0a0e96ba67c65490ec2d3b8c5
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="#"
                    className="ml-auto inline-block text-sm underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
<<<<<<< HEAD
                <Input 
                  id="password" 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
=======
                <Input id="password" type="password" required />
              </div>
              <Link href="/dashboard/production-registry" className="w-full">
                <Button className="w-full">
                  Login
                </Button>
              </Link>
>>>>>>> 0319ad85957280a0a0e96ba67c65490ec2d3b8c5
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
