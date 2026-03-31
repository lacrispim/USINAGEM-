
// Forcing a new commit to help with git synchronization and Vercel trigger.
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard/production-registry');
}
