'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { OtpInput } from '@/components/ui/otp-input';
import { t } from '@/i18n';
import { routes } from '@/lib/routes';
import { AuthFlowError, requestCode, verifyCode } from '../api';
import { emailIdentifierSchema, otpSchema, type AuthIdentifier } from '../schemas';

const RESEND_SECONDS = 60;

function messageOf(error: unknown): string {
  return error instanceof AuthFlowError ? error.message : t.errors.generic;
}

export function LoginFlow() {
  const [identifier, setIdentifier] = useState<AuthIdentifier | null>(null);

  return identifier ? (
    <CodeStep identifier={identifier} onChangeEmail={() => setIdentifier(null)} />
  ) : (
    <EmailStep onSent={setIdentifier} />
  );
}

function EmailStep({ onSent }: { onSent: (identifier: AuthIdentifier) => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = emailIdentifierSchema.safeParse({ kind: 'email', value: email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t.auth.login.invalidEmail);
      return;
    }
    setError(null);
    setPending(true);
    try {
      await requestCode(parsed.data);
      onSent(parsed.data);
    } catch (caught) {
      setError(messageOf(caught));
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t.auth.login.title}</h1>
        <p className="text-muted">{t.auth.login.subtitle}</p>
      </header>
      <TextField
        label={t.auth.login.emailLabel}
        type="email"
        name="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
        placeholder={t.auth.login.emailPlaceholder}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={error}
      />
      <Button type="submit" size="lg" loading={pending}>
        {pending ? t.auth.login.sending : t.auth.login.submit}
      </Button>
    </form>
  );
}

function CodeStep({
  identifier,
  onChangeEmail,
}: {
  identifier: AuthIdentifier;
  onChangeEmail: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const submit = async (value: string) => {
    const parsed = otpSchema.safeParse(value);
    if (!parsed.success) {
      setError(t.auth.code.incomplete);
      return;
    }
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      await verifyCode(identifier, parsed.data);
      // O proxy decide o destino; a casca leva para a criação de perfil se ainda não houver.
      router.replace(routes.conversations);
    } catch (caught) {
      setError(messageOf(caught));
      setCode('');
      setPending(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    try {
      await requestCode(identifier);
      setNotice(t.auth.code.resent);
      setSecondsLeft(RESEND_SECONDS);
    } catch (caught) {
      setError(messageOf(caught));
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(code);
      }}
      noValidate
      className="flex flex-col gap-6"
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t.auth.code.title}</h1>
        <p className="break-words text-muted">{t.auth.code.subtitle(identifier.value)}</p>
      </header>
      <div className="flex flex-col gap-2">
        <OtpInput
          value={code}
          onChange={(value) => {
            setCode(value);
            setError(null);
          }}
          onComplete={(value) => void submit(value)}
          groupLabel={t.auth.code.label}
          digitLabel={t.auth.code.digitLabel}
          invalid={Boolean(error)}
          disabled={pending}
          describedBy="otp-message"
        />
        <p id="otp-message" role="alert" className="min-h-5 text-sm text-danger">
          {error}
        </p>
        <p aria-live="polite" className="text-sm text-muted empty:hidden">
          {notice}
        </p>
      </div>
      <Button type="submit" size="lg" loading={pending}>
        {pending ? t.auth.code.verifying : t.auth.code.submit}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="link"
          size="inline"
          onClick={() => void resend()}
          disabled={secondsLeft > 0 || pending}
        >
          {secondsLeft > 0 ? t.auth.code.resendIn(secondsLeft) : t.auth.code.resend}
        </Button>
        <Button variant="link" size="inline" onClick={onChangeEmail} disabled={pending}>
          {t.auth.code.changeEmail}
        </Button>
      </div>
    </form>
  );
}
