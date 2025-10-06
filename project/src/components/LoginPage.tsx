import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export function LoginPage() {
  const { signInWithMicrosoft } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithMicrosoft();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
              <LogIn className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-semibold text-slate-900">Welcome</h1>
            <p className="text-slate-600">Sign in to manage your queues and tasks</p>
          </div>

          <button
            onClick={handleSignIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white  py-3 px-4  transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none">
              <path d="M11 0H0v11h11V0z" fill="#F25022"/>
              <path d="M23 0H12v11h11V0z" fill="#7FBA00"/>
              <path d="M11 12H0v11h11V12z" fill="#00A4EF"/>
              <path d="M23 12H12v11h11V12z" fill="#FFB900"/>
            </svg>
            Sign in with Microsoft
          </button>

          <p className="text-xs text-center text-slate-500">
            Secure authentication powered by Microsoft
          </p>
        </div>
      </div>
    </div>
  );
}
