import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, MailCheck } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Logo, Spinner } from "@/components/ui";
import { useDocumentTitle } from "@/hooks";
import { useRouter } from "@/lib/router";
import { DEMO_ADMIN } from "@/services/localRepository";
import { isDemo, repo } from "@/services";
import { useApp } from "@/store/app";
import { useUI } from "@/store/ui";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function passwordIssues(p: string) {
  const issues: string[] = [];
  if (p.length < 8) issues.push("pelo menos 8 caracteres");
  if (!/[a-zA-Z]/.test(p)) issues.push("uma letra");
  if (!/\d/.test(p)) issues.push("um número");
  return issues;
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { allTitles } = useApp();
  const wall = useMemo(() => allTitles.slice(0, 18), [allTitles]);
  const { navigate } = useRouter();
  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0 grid -rotate-6 scale-125 grid-cols-4 gap-3 opacity-30 sm:grid-cols-6" aria-hidden>
        {wall.map((t) => <img key={t.id} src={t.poster} alt="" className="aspect-[2/3] w-full rounded-lg object-cover" />)}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/90 to-ink" />
      <div className="relative z-10 flex min-h-[100svh] flex-col items-center px-4 pb-24 pt-8">
        <button onClick={() => navigate("inicio")} className="mb-10 self-start rounded-md sm:self-center" aria-label="Voltar ao início"><Logo /></button>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-[420px] rounded-2xl border border-line/80 bg-surface/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <h1 className="display text-5xl">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-mute">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}

export function PasswordField({ id, label, value, onChange, autoComplete, error }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className={`field pr-12 ${error ? "!border-ember" : ""}`} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-md text-mute hover:text-paper" aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p id={`${id}-err`} className="mt-1.5 text-sm text-ember">{error}</p>}
    </div>
  );
}

function FormError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p role="alert" className="rounded-lg border border-ember/40 bg-ember/10 px-3 py-2.5 text-sm text-[#ffb4a8]">{children}</p>;
}

export function Login() {
  useDocumentTitle("Entrar");
  const { signIn, profiles } = useApp();
  const { navigate } = useRouter();
  const { toast } = useUI();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) return setError("Informe um e-mail válido.");
    if (!password) return setError("Informe sua senha.");
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      toast("Bem-vindo de volta!");
      navigate(profiles.length > 1 ? "perfis" : "inicio", undefined, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Entrar" subtitle="Acesse sua lista, seu progresso e seus perfis.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError>{error}</FormError>
        <div>
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" type="email" inputMode="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <PasswordField id="password" label="Senha" value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="flex justify-end">
          <a href="#recuperar-senha" className="text-sm font-semibold text-lamp hover:underline">Esqueci minha senha</a>
        </div>
        <button className="btn-primary w-full min-h-[50px] text-base" disabled={busy}>{busy ? <Spinner /> : null} Entrar</button>
      </form>
      <p className="mt-6 text-center text-sm text-mute">
        Ainda não tem conta? <a href="#cadastro" className="font-semibold text-paper hover:underline">Criar conta</a>
      </p>
      {isDemo && (
        <div className="mt-6 rounded-xl border border-lamp/30 bg-lamp/[.07] p-4 text-sm">
          <p className="font-bold text-lamp">Conta de administração da demonstração</p>
          <p className="mt-1 leading-relaxed text-paper/80">E-mail {DEMO_ADMIN.email} e senha {DEMO_ADMIN.password}. Dá acesso ao painel administrativo.</p>
          <button type="button" className="mt-3 text-sm font-semibold text-lamp hover:underline" onClick={() => { setEmail(DEMO_ADMIN.email); setPassword(DEMO_ADMIN.password); }}>Preencher dados</button>
        </div>
      )}
    </AuthShell>
  );
}

export function Register() {
  useDocumentTitle("Criar conta");
  const { signUp } = useApp();
  const { navigate } = useRouter();
  const { toast } = useUI();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const errors = {
    name: form.name.trim().length < 2 ? "Informe seu nome." : "",
    email: !EMAIL_RE.test(form.email) ? "Informe um e-mail válido." : "",
    password: passwordIssues(form.password).length ? `A senha precisa de ${passwordIssues(form.password).join(", ")}.` : "",
    confirm: form.confirm !== form.password ? "As senhas não são iguais." : "",
  };
  const strength = Math.min(4, [form.password.length >= 8, /[A-Z]/.test(form.password) && /[a-z]/.test(form.password), /\d/.test(form.password), /[^\w]/.test(form.password) || form.password.length >= 14].filter(Boolean).length);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    setError(null);
    try {
      await signUp(form.name, form.email, form.password);
      toast(`Conta criada. Boas-vindas, ${form.name.split(" ")[0]}!`);
      navigate("inicio", undefined, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fieldErr = (k: keyof typeof errors) => (touched ? errors[k] : "");

  return (
    <AuthShell title="Criar conta" subtitle="Leva menos de um minuto. Sua lista e seu progresso passam a acompanhar você.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError>{error}</FormError>
        <div>
          <label htmlFor="name" className="label">Nome</label>
          <input id="name" autoComplete="name" className={`field ${fieldErr("name") ? "!border-ember" : ""}`} value={form.name} onChange={(e) => set("name")(e.target.value)} aria-invalid={!!fieldErr("name")} />
          {fieldErr("name") && <p className="mt-1.5 text-sm text-ember">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="remail" className="label">E-mail</label>
          <input id="remail" type="email" inputMode="email" autoComplete="email" className={`field ${fieldErr("email") ? "!border-ember" : ""}`} value={form.email} onChange={(e) => set("email")(e.target.value)} aria-invalid={!!fieldErr("email")} />
          {fieldErr("email") && <p className="mt-1.5 text-sm text-ember">{errors.email}</p>}
        </div>
        <div>
          <PasswordField id="rpass" label="Senha" value={form.password} onChange={set("password")} autoComplete="new-password" error={fieldErr("password")} />
          {form.password && (
            <div className="mt-2 flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < strength ? (strength <= 1 ? "bg-ember" : strength <= 2 ? "bg-lamp" : "bg-ok") : "bg-line"}`} />)}
              </div>
              <span className="text-xs text-mute">{["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"][strength]}</span>
            </div>
          )}
        </div>
        <PasswordField id="rconfirm" label="Confirmar senha" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" error={fieldErr("confirm")} />
        <button className="btn-primary w-full min-h-[50px] text-base" disabled={busy}>{busy ? <Spinner /> : null} Criar conta</button>
        <p className="text-xs leading-relaxed text-mute">A senha é protegida com hash e nunca fica guardada em texto puro.</p>
      </form>
      <p className="mt-6 text-center text-sm text-mute">Já tem conta? <a href="#entrar" className="font-semibold text-paper hover:underline">Entrar</a></p>
    </AuthShell>
  );
}

export function ForgotPassword() {
  useDocumentTitle("Recuperar senha");
  const { navigate } = useRouter();
  const { toast } = useUI();
  const recovery = repo.isRecoverySession?.() ?? false;
  const [step, setStep] = useState<"email" | "reset" | "sent">(recovery ? "reset" : "email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string>();
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (recovery) setStep("reset"); }, [recovery]);

  const request = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) return setError("Informe um e-mail válido.");
    setBusy(true); setError(null);
    try {
      const r = await repo.requestPasswordReset(email);
      if (r.demoCode) { setDemoCode(r.demoCode); setStep("reset"); }
      else setStep("sent");
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    const issues = passwordIssues(password);
    if (isDemo && code.trim().length !== 6) return setError("Informe o código de 6 dígitos.");
    if (issues.length) return setError(`A nova senha precisa de ${issues.join(", ")}.`);
    if (password !== confirmPw) return setError("As senhas não são iguais.");
    setBusy(true); setError(null);
    try {
      await repo.confirmPasswordReset(email, code, password);
      toast("Senha redefinida. Entre com a nova senha.");
      navigate("entrar", undefined, { replace: true });
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  if (step === "sent") {
    return (
      <AuthShell title="Verifique seu e-mail">
        <div className="flex gap-3 rounded-xl border border-line bg-raised/60 p-4">
          <MailCheck className="mt-0.5 shrink-0 text-lamp" size={22} />
          <p className="text-sm leading-relaxed text-paper/85">Se existir uma conta para {email}, enviamos um link para criar uma nova senha. O link vale por 1 hora.</p>
        </div>
        <button className="btn-glass mt-6 w-full" onClick={() => navigate("entrar")}>Voltar para entrar</button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Recuperar senha" subtitle={step === "email" ? "Informe o e-mail da conta. Enviaremos as instruções para criar uma nova senha." : "Crie uma nova senha para a sua conta."}>
      {step === "email" ? (
        <form onSubmit={request} className="space-y-4" noValidate>
          <FormError>{error}</FormError>
          <div>
            <label htmlFor="femail" className="label">E-mail</label>
            <input id="femail" type="email" inputMode="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn-primary w-full min-h-[50px]" disabled={busy}>{busy ? <Spinner /> : null} Enviar instruções</button>
          <a href="#entrar" className="block text-center text-sm font-semibold text-mute hover:text-paper">Voltar para entrar</a>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4" noValidate>
          <FormError>{error}</FormError>
          {demoCode && (
            <div className="flex gap-3 rounded-xl border border-lamp/30 bg-lamp/[.07] p-4 text-sm">
              <KeyRound className="mt-0.5 shrink-0 text-lamp" size={20} />
              <p className="leading-relaxed text-paper/85">No modo demonstração não há envio de e-mail. Seu código é <strong className="tracking-widest text-lamp">{demoCode}</strong> e vale por 15 minutos.</p>
            </div>
          )}
          {isDemo && (
            <div>
              <label htmlFor="code" className="label">Código de verificação</label>
              <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="field tracking-[.4em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </div>
          )}
          <PasswordField id="npass" label="Nova senha" value={password} onChange={setPassword} autoComplete="new-password" />
          <PasswordField id="npass2" label="Confirmar nova senha" value={confirmPw} onChange={setConfirmPw} autoComplete="new-password" />
          <button className="btn-primary w-full min-h-[50px]" disabled={busy}>{busy ? <Spinner /> : null} Salvar nova senha</button>
        </form>
      )}
    </AuthShell>
  );
}
