/** Rotas do app, em um só lugar. */
export const routes = {
  welcome: '/',
  login: '/entrar',
  createProfile: '/perfil/criar',
  conversations: '/conversas',
  updates: '/atualizacoes',
  calls: '/chamadas',
  settings: '/configuracoes',
} as const;

/** Rotas acessíveis sem sessão. */
export const publicRoutes: readonly string[] = [routes.welcome, routes.login];
