import { describe, expect, it } from 'vitest';
import { routes } from '@/lib/routes';
import { isActive, navItems } from './navigation';

describe('navegação', () => {
  it('tem as quatro seções na ordem pedida', () => {
    expect(navItems.map((item) => item.href)).toEqual([
      routes.conversations,
      routes.updates,
      routes.calls,
      routes.settings,
    ]);
  });

  it('marca a seção ativa também em telas internas', () => {
    expect(isActive('/conversas', '/conversas')).toBe(true);
    expect(isActive('/conversas/123', '/conversas')).toBe(true);
    expect(isActive('/conversas-arquivadas', '/conversas')).toBe(false);
    expect(isActive('/chamadas', '/conversas')).toBe(false);
  });
});
