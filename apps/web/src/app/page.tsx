import { Button } from '@sms/shared-ui';
import { apiClient } from '@sms/api-client';
import { useAuth } from '@sms/api-client/src';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">School Management System</h1>
      <p className="text-lg mb-8">Welcome to the main application</p>
      <Link href="/login">
        <Button>Login</Button>
      </Link>
    </main>
  );
}
