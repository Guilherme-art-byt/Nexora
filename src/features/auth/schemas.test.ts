import { describe, expect, it } from 'vitest';
import { authIdentifierSchema, emailIdentifierSchema, otpSchema } from './schemas';

describe('emailIdentifierSchema', () => {
  it('normaliza o e-mail', () => {
    expect(emailIdentifierSchema.parse({ kind: 'email', value: '  Ana@Exemplo.COM ' })).toEqual({
      kind: 'email',
      value: 'ana@exemplo.com',
    });
  });

  it.each(['', 'ana', 'ana@', '@exemplo.com', 'ana exemplo@x.com'])('recusa "%s"', (value) => {
    expect(emailIdentifierSchema.safeParse({ kind: 'email', value }).success).toBe(false);
  });
});

describe('authIdentifierSchema', () => {
  it('já aceita telefone no formato internacional (login por SMS futuro)', () => {
    expect(authIdentifierSchema.safeParse({ kind: 'phone', value: '+5511999998888' }).success).toBe(
      true,
    );
    expect(authIdentifierSchema.safeParse({ kind: 'phone', value: '11999998888' }).success).toBe(
      false,
    );
  });
});

describe('otpSchema', () => {
  it('aceita exatamente 6 dígitos', () => {
    expect(otpSchema.safeParse('123456').success).toBe(true);
  });

  it.each(['12345', '1234567', '12a456', ''])('recusa "%s"', (value) => {
    expect(otpSchema.safeParse(value).success).toBe(false);
  });
});
