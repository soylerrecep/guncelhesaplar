import React, { useState, useEffect, useRef } from 'react';
import { Trash2, AlertTriangle, X, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  requiredPassword?: string;
  passwordPlaceholder?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Evet, Onayla',
  cancelLabel = 'İptal',
  isDanger = true,
  requiredPassword,
  passwordPlaceholder = 'Güvenlik şifresini girin...',
  onConfirm,
  onCancel
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setShowPassword(false);
      // Auto focus password input if required
      if (requiredPassword) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  }, [isOpen, requiredPassword]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (requiredPassword) {
      if (!password.trim()) {
        setError('Lütfen sıfırlama şifresini giriniz.');
        inputRef.current?.focus();
        return;
      }
      if (password.trim() !== requiredPassword) {
        setError('Hatalı şifre! İşlem onaylanmadı. (Yetkili şifresi gereklidir)');
        inputRef.current?.focus();
        return;
      }
    }

    setError(null);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#1c222b] border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl text-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-full shrink-0 ${
                isDanger
                  ? 'bg-rose-950/80 text-rose-400 border border-rose-800'
                  : 'bg-amber-950/80 text-amber-400 border border-amber-800'
              }`}
            >
              {requiredPassword ? (
                <ShieldAlert className="w-5 h-5" />
              ) : isDanger ? (
                <Trash2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{title}</h3>
              {requiredPassword && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900/50 mt-1">
                  <Lock className="w-3 h-3" /> Şifre Korumalı Güvenlik İşlemi
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mt-3.5 leading-relaxed">
          {message}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {requiredPassword && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-300">
                Onay Şifresi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={passwordPlaceholder}
                  className={`w-full pl-9 pr-10 py-2.5 bg-slate-900 border rounded-lg text-sm text-white placeholder-slate-500 font-mono focus:outline-none transition-colors ${
                    error
                      ? 'border-rose-500 ring-1 ring-rose-500'
                      : 'border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  }`}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <div className="p-2 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDanger
                  ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700'
              }`}
            >
              {requiredPassword && <Lock className="w-3.5 h-3.5" />}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
