import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';

export function NotFoundPage() {
  useSEO({
    title: 'Page Not Found | SkulManager',
    description: 'The page you are looking for does not exist.',
    path: '/404',
    noindex: true,
  });
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-4">
      <div className="text-center text-white max-w-md">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mx-auto mb-6">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-6xl font-extrabold mb-4">404</h1>
        <p className="text-lg text-blue-100 mb-8">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold" onClick={() => navigate('/')}>
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
          <Button size="lg" variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
