'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/chat');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-center dark:text-white">Login</h1>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <input className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button disabled={loading} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50">
          {loading ? '...' : 'Login'}
        </button>
        <p className="text-sm text-center dark:text-gray-300">
          No account? <Link href="/signup" className="text-green-600">Sign up</Link>
        </p>
      </form>
    </div>
  );
}