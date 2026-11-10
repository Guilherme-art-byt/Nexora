import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import { profileFormSchema, usernameSchema } from './schemas';

describe('usernameSchema', () => {
  it.each(['ana', 'bruno.lima', 'carla_99', 'a.b', 'x'.repeat(20)])('aceita %s', (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(true);
  });

  it.each(['ab', 'x'.repeat(21), 'com espaço', 'acentuação', 'traço-não', '@ana', ''])(
    'recusa %s',
    (value) => {
      expect(usernameSchema.safeParse(value).success).toBe(false);
    },
  );

  it('normaliza para minúsculas e remove espaços nas pontas', () => {
    expect(usernameSchema.parse('  Ana.Souza ')).toBe('ana.souza');
  });
});

describe('profileFormSchema', () => {
  const valid = { displayName: 'Ana Souza', username: 'ana', about: 'Disponível' };

  it('aceita um perfil válido e apara os textos', () => {
    expect(profileFormSchema.parse({ ...valid, displayName: '  Ana Souza  ' })).toEqual(valid);
  });

  it('exige nome', () => {
    const result = profileFormSchema.safeParse({ ...valid, displayName: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(t.profile.validation.nameRequired);
  });

  it('limita o nome a 50 e o recado a 140 caracteres', () => {
    expect(profileFormSchema.safeParse({ ...valid, displayName: 'a'.repeat(51) }).success).toBe(
      false,
    );
    expect(profileFormSchema.safeParse({ ...valid, about: 'a'.repeat(141) }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...valid, about: 'a'.repeat(140) }).success).toBe(true);
  });

  it('permite recado vazio', () => {
    expect(profileFormSchema.safeParse({ ...valid, about: '' }).success).toBe(true);
  });
});
