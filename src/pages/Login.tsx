import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { loginWithEmail, registerUser, loginWithGoogle } from '@/services/supabaseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, User, Chrome, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await loginWithEmail(email, password);
        if (error) throw error;
        toast.success('Welcome back!');
      } else {
        const { error } = await registerUser(email, password, name);
        if (error) throw error;
        toast.success('Account created successfully!');
      }
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Auth error:', error);
      const errorMessage = error.originalError?.message || error.message || 'Authentication failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      toast.error(error.message || 'Google login failed');
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#f8f9ff] relative overflow-hidden p-4 font-sans text-foreground">
      {/* Background decoration - soft airy gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-secondary/10 rounded-full blur-[120px] opacity-40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <span className="text-4xl font-serif font-medium text-primary-900 tracking-tight">echo</span>
            <span className="ml-1 mt-3 h-2.5 w-2.5 rounded-full bg-primary shadow-sm shadow-primary/40"></span>
          </div>
          <h1 className="text-3xl font-serif font-medium text-primary-900 mb-2 leading-tight">
            {isLogin ? 'The Digital Sanctuary' : 'Begin Your Journey'}
          </h1>
          <p className="text-muted-foreground font-medium">
            {isLogin ? 'Return to your path of clarity' : 'Create space for reflection and insight'}
          </p>
        </div>

        <div className="glass-card border-white shadow-subtle p-8">
          <div className="flex bg-muted/50 rounded-full p-1 mb-8 border border-border/50">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${isLogin ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${!isLogin ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="space-y-2"
                >
                  <Label htmlFor="name" className="text-primary-900 font-semibold ml-1">Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Your name"
                      className="pl-11 h-12 bg-white/50 border-border/80 rounded-2xl focus:bg-white transition-all shadow-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-primary-900 font-semibold ml-1">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-11 h-12 bg-white/50 border-border/80 rounded-2xl focus:bg-white transition-all shadow-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-primary-900 font-semibold">Password</Label>
                {isLogin && (
                  <button type="button" className="text-xs font-semibold text-primary hover:text-primary-900 transition-colors">
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-11 h-12 bg-white/50 border-border/80 rounded-2xl focus:bg-white transition-all shadow-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full mt-4 group rounded-full font-bold shadow-hover" disabled={loading}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Login to Echo' : 'Start Your Journal'}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#fcfdff]/80 backdrop-blur-sm px-4 text-muted-foreground font-semibold tracking-wider">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button variant="outline" size="lg" className="bg-white border-border/60 text-primary-900 hover:bg-muted font-bold rounded-full shadow-subtle border" onClick={handleGoogleLogin}>
              <Chrome className="mr-2 h-5 w-5" />
              Sign in with Google
            </Button>
          </div>

          <p className="text-[12px] text-center text-muted-foreground mt-8 leading-relaxed">
            By continuing, you agree to Echo's{' '}
            <a href="#" className="font-semibold text-primary underline underline-offset-4 hover:text-primary-900">Terms of Service</a>{' '}
            and{' '}
            <a href="#" className="font-semibold text-primary underline underline-offset-4 hover:text-primary-900">Privacy Policy</a>.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
