import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase';
import {
  School,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface LoginScreenProps {
  schoolName: string;
  schoolCode: string;
  adminName: string;
  logoBase64?: string;
  schoolYear?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  schoolName,
  schoolCode,
  adminName,
  logoBase64,
  schoolYear,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResetSending, setIsResetSending] = useState(false);

  // Helper error message translator
  const formatFirebaseError = (err: any): string => {
    const code = err?.code || '';
    if (code.includes('user-not-found')) return 'Tiada akaun ditemui dengan emel ini.';
    if (code.includes('wrong-password') || code.includes('invalid-credential')) {
      return 'Kata laluan atau emel tidak sah. Sila cuba lagi.';
    }
    if (code.includes('email-already-in-use')) {
      return 'Emel ini telah didaftarkan. Sila log masuk terus.';
    }
    if (code.includes('invalid-email')) return 'Format emel tidak sah.';
    if (code.includes('weak-password')) {
      return 'Kata laluan terlalu lemah (minimum 6 aksara diperlukan).';
    }
    if (code.includes('popup-closed-by-user')) return 'Tetingkap log masuk Google ditutup oleh pengguna.';
    return err?.message || 'Ralat berlaku semasa log masuk. Sila cuba lagi.';
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email || !password) {
      setErrorMsg('Sila masukkan Emel ID dan Kata Laluan anda.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        setInfoMsg(`Akaun berjaya didaftarkan untuk ${userCred.user.email}!`);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      setErrorMsg(formatFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setErrorMsg(formatFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsResetSending(true);
    setErrorMsg('');
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setInfoMsg(`Pautan tetapan semula kata laluan telah dihantar ke emel: ${forgotEmail}`);
      setShowForgotModal(false);
      setForgotEmail('');
    } catch (err: any) {
      setErrorMsg(formatFirebaseError(err));
    } finally {
      setIsResetSending(false);
    }
  };

  // Quick fill accounts for convenience of teachers / administrators
  const handleQuickFill = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('skTudan2026');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-10 selection:bg-emerald-500 selection:text-white">
      
      {/* Top Identity Card */}
      <div className="w-full max-w-md text-center mb-6">
        {logoBase64 ? (
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white p-2 shadow-2xl shadow-emerald-950/50 border-2 border-emerald-500/40 mb-3.5">
            <img
              src={logoBase64}
              alt="Logo Sekolah"
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-900/40 border border-emerald-400/40 mb-3.5">
            <School className="w-9 h-9" />
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {schoolName}
        </h1>
        <p className="text-xs sm:text-sm font-medium text-emerald-400 mt-1">
          Sistem Rekod Pembayaran Yuran & Keperluan Persekolahan ({schoolCode}){schoolYear ? ` • Sesi ${schoolYear}` : ''}
        </p>
        <div className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Akses Selamat Menggunakan Emel ID Rasmi Guru & Petugas</span>
        </div>
      </div>

      {/* Main Login Box */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-200">
        <div className="mb-6 text-center">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {isSignUp ? 'Daftar Emel ID Baharu' : 'Log Masuk Emel ID'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isSignUp
              ? 'Daftarkan emel ID anda untuk merekod dan memantau kutipan yuran'
              : 'Sila masukkan Emel ID dan Kata Laluan anda untuk meneruskan'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-start space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Info Alert */}
        {infoMsg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-start space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{infoMsg}</span>
          </div>
        )}

        {/* Login / Signup Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Penuh Guru / Petugas
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Cikgu Noraini binti Daud"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-900"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Emel ID (Email Address) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@moe-dl.edu.my atau emel guru"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-900"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Kata Laluan <span className="text-red-500">*</span>
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                >
                  Lupa kata laluan?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 aksara"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-900"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition active:scale-98 flex items-center justify-center space-x-2 cursor-pointer mt-2"
          >
            <span>{isSignUp ? 'Daftar Akaun & Masuk' : 'Log Masuk Sistem'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-bold text-[10px]">
              Atau Log Masuk Melalui
            </span>
          </div>
        </div>

        {/* Google One-Click Login */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-2 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl shadow-2xs transition flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Log Masuk dengan Google Account</span>
        </button>

        {/* Toggle Sign Up / Sign In */}
        <div className="mt-5 text-center text-xs text-slate-500">
          {isSignUp ? (
            <p>
              Sudah mempunyai akaun?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg('');
                }}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                Log Masuk Sekarang
              </button>
            </p>
          ) : (
            <p>
              Belum mempunyai akaun Emel ID?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg('');
                }}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                Daftar Emel ID Baharu
              </button>
            </p>
          )}
        </div>

        {/* Preset Sample Logins for Easy Teacher Demo */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>Pilihan Emel Rasmi Sekolah (Tekan untuk isi):</span>
          </p>
          <div className="grid grid-cols-1 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill('gurubesar@sktudan.edu.my')}
              className="text-left px-2.5 py-1.5 rounded-lg bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 font-medium transition cursor-pointer flex items-center justify-between"
            >
              <span>{adminName} (Guru Besar)</span>
              <span className="font-mono text-[10px] text-emerald-700">Pentadbir</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('guru.kelas@sktudan.edu.my')}
              className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium transition cursor-pointer flex items-center justify-between"
            >
              <span>Guru Kelas / Petugas Yuran</span>
              <span className="font-mono text-[10px] text-slate-500">Petugas</span>
            </button>
          </div>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Tetapkan Semula Kata Laluan</h3>
            <p className="text-xs text-slate-500">
              Masukkan emel ID anda. Kami akan menghantar pautan pengesahan untuk menetapkan semula kata laluan anda.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="emel.anda@sktudan.edu.my"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-900"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isResetSending}
                  className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isResetSending ? 'Menghantar...' : 'Hantar Pautan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer info */}
      <p className="text-[11px] text-slate-500 mt-6 text-center">
        © 2026 {schoolName} • Dilindungi dengan Firebase Authentication (Google Workspace & Email ID)
      </p>

    </div>
  );
};
