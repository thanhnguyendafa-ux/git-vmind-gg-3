import * as React from 'react';
import { supabase } from '../../services/supabaseClient';
import Icon from '../../components/ui/Icon';
import { useUserStore } from '../../stores/useUserStore';
import { useUIStore } from '../../stores/useUIStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import AuroraBackground from '../../components/ui/AuroraBackground';
import { LivingTreeVisual } from '../../components/ui/LivingTreeVisual';

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

// --- Auth Form Component (Unchanged) ---
// Kept simple for now, can be refactored later if needed.
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
        <div className="min-h-[100dvh] flex items-center justify-center p-4 relative z-10 animate-fade-scale-in">
            <div className="absolute top-8 left-8">
                <button onClick={onBack} className={`flex items-center gap-2 transition-colors group ${isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                    <div className={`p-2 rounded-full transition-colors ${isDark ? 'bg-white/5 group-hover:bg-white/10' : 'bg-white group-hover:bg-slate-100 shadow-sm'}`}>
                        <Icon name="arrowLeft" className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">Back to Garden</span>
                </button>
            </div>

            <GlassCard className="w-full max-w-md p-8 md:p-10">
                <div className="text-center mb-8">
                    <h2 className={`text-3xl font-serif font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{mode === 'login' ? 'Welcome Back' : 'Plant Your First Seed'}</h2>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        {mode === 'login' ? 'The garden has missed you.' : 'Begin your journey of growth today.'}
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
                        {loading ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : (mode === 'login' ? 'Enter Garden' : 'Start Growing')}
                    </Button>
                </form>

                <div className={`mt-8 pt-6 border-t text-center ${isDark ? 'border-white/10' : 'border-secondary-200'}`}>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        {mode === 'login' ? "Don't have a plot?" : "Already gardening?"}
                        <button onClick={onSwitchMode} className="ml-2 text-primary-500 hover:text-primary-400 font-bold hover:underline transition-all">
                            {mode === 'login' ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>
            </GlassCard>
        </div>
    );
};

// --- New Landing View (Humanized) ---

const LandingView: React.FC<{
    onGuestLogin: () => void;
    onNavigateAuth: (mode: 'login' | 'signup') => void
}> = ({ onGuestLogin, onNavigateAuth }) => {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    return (
        <div className="relative z-10 min-h-[100dvh] flex flex-col font-sans overflow-hidden">
            {/* Navbar */}
            <nav className="w-full px-6 py-8 flex justify-between items-center max-w-7xl mx-auto animate-fadeIn z-50">
                <div className="flex items-center gap-3 group cursor-default">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-12 ${isDark ? 'bg-gradient-to-br from-emerald-500 to-primary-700 shadow-emerald-900/50' : 'bg-white text-primary-600 shadow-emerald-100'}`}>
                        <span className="font-serif font-bold text-xl">V</span>
                    </div>
                    <span className={`text-xl font-bold tracking-tight font-serif ${isDark ? 'text-white' : 'text-primary-950'}`}>Vmind</span>
                </div>
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => onNavigateAuth('login')}
                        className={`text-sm font-semibold transition-colors ${isDark ? 'text-emerald-100/70 hover:text-white' : 'text-slate-600 hover:text-primary-800'}`}
                    >
                        Log In
                    </button>
                    <button
                        onClick={onGuestLogin}
                        className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg active:scale-95 border ${isDark ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-primary-900 text-white hover:bg-primary-800 border-transparent shadow-primary-900/30'}`}
                    >
                        Guest Access
                    </button>
                </div>
            </nav>

            {/* Split Hero Section */}
            <section className="flex-1 flex flex-col lg:flex-row items-center justify-center max-w-7xl mx-auto w-full px-6 py-12 lg:py-0 gap-12 lg:gap-24">

                {/* Left: The Narrative */}
                <div className="flex-1 space-y-10 max-w-2xl lg:max-w-none text-center lg:text-left animate-slideInUp">
                    <div className="space-y-6">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border ${isDark ? 'bg-white/5 border-white/10' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-bold tracking-wide uppercase">Vmind 3.0: Ethereal</span>
                        </div>

                        <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-serif font-medium tracking-tight leading-[1.1] ${isDark ? 'text-white' : 'text-primary-950'}`}>
                            Tend to your <br className="hidden lg:block" />
                            <span className="relative inline-block">
                                <span className={`relative z-10 ${isDark ? 'text-emerald-300' : 'text-primary-600'}`}>mind.</span>
                                <span className={`absolute bottom-2 left-0 w-full h-3 -z-0 opacity-40 ${isDark ? 'bg-emerald-600' : 'bg-emerald-200'} rounded-full transform -rotate-2`}></span>
                            </span>
                        </h1>

                        <p className={`text-xl leading-relaxed opacity-90 ${isDark ? 'text-emerald-100/80 font-light' : 'text-slate-600 font-normal'} max-w-lg mx-auto lg:mx-0`}>
                            Stop pouring water into a leaking bucket. Vmind isn't just flashcards; it's a living garden where every word you learn plants a seed. Watch them grow, or watch them wither.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4">
                        <button
                            onClick={onGuestLogin}
                            className="h-14 px-10 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-lg shadow-xl shadow-emerald-900/20 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto flex items-center justify-center gap-2"
                        >
                            <span>Start Gardening</span>
                            <Icon name="arrowRight" className="w-5 h-5 opacity-80" />
                        </button>
                        <button
                            onClick={() => onNavigateAuth('signup')}
                            className={`h-14 px-10 rounded-full font-bold text-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95 w-full sm:w-auto border flex items-center justify-center ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm'}`}
                        >
                            Create Account
                        </button>
                    </div>

                    {/* Founder's Note / Human Element */}
                    <div className={`mt-8 pt-8 border-t ${isDark ? 'border-white/10' : 'border-slate-200'} flex items-start gap-4 max-w-md mx-auto lg:mx-0 text-left`}>
                        <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-serif font-bold ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            V
                        </div>
                        <div>
                            <p className={`text-sm italic mb-1 ${isDark ? 'text-emerald-100/80' : 'text-slate-600'}`}>
                                "I built Vmind because I was tired of treating my brain like a hard drive. Learning should be organic, not mechanical."
                            </p>
                            <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-emerald-500' : 'text-primary-600'}`}>
                                — The Founder
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: The Visual */}
                <div className="flex-1 w-full max-w-xl lg:max-w-none aspect-square lg:aspect-auto h-[400px] lg:h-[600px] animate-fade-in-up delay-200">
                    <LivingTreeVisual />
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 text-center text-xs opacity-60">
                <p className={isDark ? 'text-emerald-100/50' : 'text-slate-500'}>
                    © {new Date().getFullYear()} Vmind. Cultivated with patience.
                </p>
            </footer>
        </div>
    );
};

// --- Main Auth Screen ---

const AuthScreen: React.FC = () => {
    const [viewMode, setViewMode] = React.useState<AuthViewMode>('landing');
    const { handleGuestLogin } = useUserStore();
    const { theme } = useUIStore();

    return (
        <div className={`min-h-[100dvh] font-sans text-text-main overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-900 relative ${theme === 'dark' ? 'bg-[#051A14]' : 'bg-[#F8FAF9]'}`}>
            <AuroraBackground />

            {/* Organic Noise Texture Overlay */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-overlay"></div>

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