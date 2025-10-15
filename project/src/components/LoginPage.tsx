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
    <div className="min-h-screen flex">
      {/* Left Gradient Section - Narrower with Bottom Curve */}
      <div className="hidden md:flex md:w-2/5 bg-gradient-to-b from-[#1D1E4E] to-[#E6692C] relative overflow-hidden"
           style={{ borderBottomRightRadius: '220px' }}>
        
        {/* Background Decorative Circles - More Blurred */}
        <div className="absolute top-16 left-8 w-36 h-36 bg-white bg-opacity-10 rounded-full blur-xl"></div>
        <div className="absolute top-1/3 right-16 w-28 h-28 bg-white bg-opacity-8 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/3 left-24 w-44 h-44 bg-white bg-opacity-5 rounded-full blur-lg"></div>
        <div className="absolute bottom-20 right-10 w-20 h-20 bg-white bg-opacity-6 rounded-full blur-2xl"></div>
        
        {/* Content */}
        <div className="relative z-10 p-12 flex flex-col justify-center text-white pl-12">
          <div className="space-y-4">
            <div className="text-4xl font-normal leading-tight">
              Tuli Executive<br />
              Travels and<br />
              <span className="font-bold text-5xl">adventures</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form Section - Properly Centered */}
      <div className="w-full md:w-3/5 bg-[#F7F8FA] flex items-center justify-center p-8">
        <div className="w-full max-w-md flex flex-col items-center justify-center">
          {/* Header */}
          <div className="text-center space-y-2 mb-10 w-full">
            <h1 className="text-4xl font-semibold text-gray-900">Login</h1>
            <p className="text-gray-600 text-lg">Login to your account below</p>
          </div>

          {/* Microsoft Sign In Button - Narrower and Centered */}
          <div className="w-full flex justify-center">
            <button
              onClick={handleSignIn}
              className="w-3/4 bg-[#403B8E] hover:bg-[#322F73] text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 23 23" fill="none">
                <path d="M11 0H0v11h11V0z" fill="#F25022"/>
                <path d="M23 0H12v11h11V0z" fill="#7FBA00"/>
                <path d="M11 12H0v11h11V12z" fill="#00A4EF"/>
                <path d="M23 12H12v11h11V12z" fill="#FFB900"/>
              </svg>
              Sign in with Microsoft
              <LogIn className="w-3 h-3 ml-auto" />
            </button>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 w-full">
            <p className="text-gray-600 text-sm">
              Don't have an account?{' '}
              <a href="#" className="text-[#E6692C] font-medium hover:text-[#d45a20]">
                Contact Administrator
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}