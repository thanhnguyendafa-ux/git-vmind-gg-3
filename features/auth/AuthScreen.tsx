import * as React from 'react';
import { supabase } from '../../services/supabaseClient';
import Icon from '../../components/ui/Icon';
import { useUserStore } from '../../stores/useUserStore';
import { useUIStore } from '../../stores/useUIStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import AuroraBackground from '../../components/ui/AuroraBackground';

// --- Types ---
type AuthViewMode = 'landing' | 'login' | 'signup';

// --- Visual Components ---

const GlassCard: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => (
  <div 
    className={`
      relative overflow-hidden rounded-3xl backdrop-blur-xl transition-all duration-500
      dark:bg-white/5 dark:border-white/10 dark:shadow-2xl dark:shadow-black/50
      bg-white/60 border border-white/60 shadow-xl shadow-emerald-100/50
      ${className}
    `}
    style={{ animation: 'fadeIn 0.8s ease-out backwards', animationDelay: `${delay}ms` }}
  >
    {/* Subtle inner light reflection */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none opacity-50 dark:opacity-10" />
    {children}
  </div>
);

const BentoCard: React.FC<{ title: string; desc: string; icon: string; className?: string; delay?: number; children?: React.ReactNode }> = ({ title, desc, icon, className, delay, children }) => {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  return (
    <GlassCard className={`group hover:-translate-y-1 transition-all duration-500 ${isDark ? 'hover:bg-white/10 hover:border-white/20' : 'hover:bg-white/80 hover:border-white/80'} ${className}`} delay={delay}>
      <div className="relative z-10 p-6 flex flex-col h-full">
        <div className={`mb-4 p-3 w-fit rounded-2xl transition-colors shadow-inner ${isDark ? 'bg-white/10 text-primary-400 group-hover:text-primary-300' : 'bg-white text-primary-600 shadow-sm border border-secondary-100'}`}>
          <Icon name={icon} className="w-6 h-6" />
        </div>
        <h3 className={`text-xl font-bold mb-2 font-serif tracking-wide ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
        <p className={`text-sm mb-4 leading-relaxed font-nunitosans ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{desc}</p>
        <div className="mt-auto w-full">
          {children}
        </div>
      </div>
    </GlassCard>
  );
};

// --- Auth Form Component ---

const AuthForm: React.FC<{ mode: 'login' | 'signup'; onBack: () => void; onSwitchMode: () => void }> = ({ mode, onBack, onSwitchMode }) => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [message, setMessage] = React.useState<string | null>(null);
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMessage('Check your email for the confirmation link!');
            }
        } catch (err: any) {
            setError(err.error_description || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative z-10 animate-fade-scale-in">
            <div className="absolute top-8 left-8">
                <button onClick={onBack} className={`flex items-center gap-2 transition-colors group ${isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                    <div className={`p-2 rounded-full transition-colors ${isDark ? 'bg-white/5 group-hover:bg-white/10' : 'bg-white group-hover:bg-slate-100 shadow-sm'}`}>
                        <Icon name="arrowLeft" className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">Back to Home</span>
                </button>
            </div>

            <GlassCard className="w-full max-w-md p-8 md:p-10">
                <div className="text-center mb-8">
                    <h2 className={`text-3xl font-serif font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{mode === 'login' ? 'Welcome Back' : 'Join the Garden'}</h2>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        {mode === 'login' ? 'Continue your journey to mastery.' : 'Start your spaced repetition journey.'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Email</label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={`h-12 border transition-all ${isDark ? 'bg-black/30 border-white/10 text-white placeholder:text-gray-600 focus:border-primary-500' : 'bg-white border-secondary-200 text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:ring-primary-500/20 shadow-inner'}`}
                            placeholder="scholar@vmind.app"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Password</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={`h-12 border transition-all ${isDark ? 'bg-black/30 border-white/10 text-white placeholder:text-gray-600 focus:border-primary-500' : 'bg-white border-secondary-200 text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:ring-primary-500/20 shadow-inner'}`}
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                            <Icon name="error-circle" className="w-5 h-5 text-red-500" />
                            <p className={`text-xs ${isDark ? 'text-red-200' : 'text-red-700'}`}>{error}</p>
                        </div>
                    )}
                    
                    {message && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                            <Icon name="check-circle" className="w-5 h-5 text-green-500" />
                            <p className={`text-xs ${isDark ? 'text-green-200' : 'text-green-700'}`}>{message}</p>
                        </div>
                    )}

                    <Button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 text-white border-none shadow-lg shadow-primary-900/20 transform hover:scale-[1.02] transition-transform duration-200"
                    >
                        {loading ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : (mode === 'login' ? 'Log In' : 'Create Account')}
                    </Button>
                </form>

                <div className={`mt-8 pt-6 border-t text-center ${isDark ? 'border-white/10' : 'border-secondary-200'}`}>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                        <button onClick={onSwitchMode} className="ml-2 text-primary-500 hover:text-primary-400 font-bold hover:underline transition-all">
                            {mode === 'login' ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>
            </GlassCard>
        </div>
    );
};

// --- Landing View ---

const LandingView: React.FC<{ 
    onGuestLogin: () => void; 
    onNavigateAuth: (mode: 'login' | 'signup') => void 
}> = ({ onGuestLogin, onNavigateAuth }) => {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    return (
        <div className="relative z-10 min-h-screen flex flex-col">
            {/* Navbar */}
            <nav className="w-full px-6 py-6 flex justify-between items-center max-w-7xl mx-auto animate-fadeIn">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20 ${isDark ? 'bg-gradient-to-br from-primary-400 to-emerald-600' : 'bg-primary-600 text-white'}`}>
                        <span className="font-serif font-bold text-lg">V</span>
                    </div>
                    <span className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-primary-950'}`}>Vmind</span>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => onNavigateAuth('login')}
                        className={`text-sm font-semibold transition-colors px-4 py-2 ${isDark ? 'text-gray-300 hover:text-white' : 'text-slate-600 hover:text-primary-600'}`}
                    >
                        Log In
                    </button>
                    <button 
                        onClick={onGuestLogin}
                        className={`text-sm font-bold px-5 py-2.5 rounded-full transition-all shadow-lg active:scale-95 border ${isDark ? 'bg-primary-400 hover:bg-primary-300 text-primary-950 border-transparent hover:shadow-primary-500/25' : 'bg-white hover:bg-secondary-50 text-primary-600 border-secondary-200'}`}
                    >
                        Try Guest Mode
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 max-w-5xl mx-auto w-full">
                <div className="animate-slideInUp space-y-8">
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white/50 shadow-sm'}`}>
                        <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                        <span className={`text-xs font-medium tracking-wide uppercase ${isDark ? 'text-primary-100' : 'text-primary-800'}`}>Vmind 2.6 is Live</span>
                    </div>
                    
                    <h1 className={`text-6xl md:text-8xl font-serif font-medium tracking-tight leading-[1.1] ${isDark ? 'text-white' : 'text-primary-950'}`}>
                        Master Vocabulary.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-emerald-400 to-sky-400">
                            Cultivate Your Mind.
                        </span>
                    </h1>
                    
                    <p className={`text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                        The AI-powered spaced repetition system that turns memory into a living garden. 
                        Create, study, and watch your knowledge grow.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <button 
                            onClick={onGuestLogin}
                            className="h-14 px-8 rounded-full bg-gradient-to-r from-primary-500 to-emerald-600 hover:from-primary-400 hover:to-emerald-500 text-white font-bold text-lg shadow-xl shadow-primary-500/20 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                        >
                            Start Growing Now
                        </button>
                        <button 
                            onClick={() => onNavigateAuth('signup')}
                            className={`h-14 px-8 rounded-full font-bold text-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 w-full sm:w-auto border ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-white/80 hover:bg-white border-white text-slate-700 shadow-md'}`}
                        >
                            Create Account
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="px-4 py-20 w-full max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
                    {/* Card 1: AI (Wide) */}
                    <BentoCard 
                        title="Gemini AI Intelligence" 
                        desc="Generate example sentences, explanations, and visual mnemonics instantly. Your personal AI tutor is built into every card."
                        icon="sparkles"
                        className="md:col-span-2 md:row-span-1"
                        delay={100}
                    >
                        <div className={`flex gap-2 mt-4 opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500`}>
                            <div className="h-2 w-24 bg-primary-500 rounded-full"></div>
                            <div className="h-2 w-16 bg-blue-500 rounded-full"></div>
                            <div className="h-2 w-32 bg-purple-500 rounded-full"></div>
                        </div>
                    </BentoCard>

                    {/* Card 2: Garden (Tall) */}
                    <BentoCard 
                        title="The Garden" 
                        desc="Visualize your progress as a living ecosystem. Earn droplets by studying to nurture your Spirit Tree from a seed to an eternal guardian."
                        icon="tree"
                        className={`md:col-span-1 md:row-span-2 ${isDark ? 'bg-gradient-to-b from-white/5 to-emerald-900/20' : 'bg-gradient-to-b from-white/60 to-emerald-50/50'}`}
                        delay={200}
                    >
                        <div className="flex justify-center items-center h-40 mt-4 relative">
                            <div className="absolute w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
                            <Icon name="tree" className="w-20 h-20 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" variant="filled" />
                        </div>
                    </BentoCard>

                    {/* Card 3: Confidence */}
                    <BentoCard 
                        title="Confidence Mode" 
                        desc="A short-term mastery loop designed for rapid cramming. Sort cards by how well you know them."
                        icon="stack-of-cards"
                        className="md:col-span-1"
                        delay={300}
                    />

                    {/* Card 4: Theater */}
                    <BentoCard 
                        title="Theater Mode" 
                        desc="Hands-free passive learning. Watch your vocabulary play out like a movie while you work or relax."
                        icon="film"
                        className="md:col-span-1"
                        delay={400}
                    />
                </div>
            </section>

            {/* Social Proof / Metrics */}
            <section className={`py-20 border-t backdrop-blur-sm ${isDark ? 'border-white/5 bg-black/20' : 'border-secondary-200 bg-white/30'}`}>
                <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-12 md:gap-24 text-center">
                    <div className="space-y-1">
                        <p className={`text-4xl font-serif font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>100%</p>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Focus</p>
                    </div>
                    <div className="space-y-1">
                        <p className={`text-4xl font-serif font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Zero</p>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Distractions</p>
                    </div>
                    <div className="space-y-1">
                        <p className={`text-4xl font-serif font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Offline</p>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Capable</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 text-center text-gray-500 text-sm">
                <div className={`flex justify-center gap-6 mb-8 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    <span className="hover:text-primary-500 cursor-pointer transition-colors">Privacy</span>
                    <span className="hover:text-primary-500 cursor-pointer transition-colors">Terms</span>
                    <span className="hover:text-primary-500 cursor-pointer transition-colors">About</span>
                </div>
                <p>© {new Date().getFullYear()} Vmind. Built for the curious mind.</p>
                <div className={`mt-4 inline-block px-3 py-1 rounded-full text-xs font-mono border ${isDark ? 'bg-white/5 border-white/5 text-gray-600' : 'bg-white/60 border-secondary-200 text-slate-500'}`}>
                    v2.6 Ethereal
                </div>
            </footer>
        </div>
    );
};

// --- Main Auth Screen ---

const AuthScreen: React.FC = () => {
    const [viewMode, setViewMode] = React.useState<AuthViewMode>('landing');
    const { handleGuestLogin } = useUserStore();
    
    return (
        <div className="min-h-screen font-sans text-text-main overflow-x-hidden selection:bg-primary-500/30 selection:text-primary-900 relative">
            <AuroraBackground />
            
            {viewMode === 'landing' ? (
                <LandingView 
                    onGuestLogin={handleGuestLogin}
                    onNavigateAuth={(mode) => setViewMode(mode)}
                />
            ) : (
                <AuthForm 
                    mode={viewMode as 'login' | 'signup'}
                    onBack={() => setViewMode('landing')}
                    onSwitchMode={() => setViewMode(viewMode === 'login' ? 'signup' : 'login')}
                />
            )}
        </div>
    );
};

export default AuthScreen;