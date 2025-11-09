// Browser-specific utilities
const isBrowser = typeof window !== 'undefined';

export const browser = {
  get localStorage() {
    return isBrowser ? window.localStorage : null;
  },

  getAccessToken: (): string | null => {
    return browser.localStorage?.getItem('access_token') ?? null;
  },

  getRefreshToken: (): string | null => {
    return browser.localStorage?.getItem('refresh_token') ?? null;
  },

  setTokens: (tokens: { access_token: string; refresh_token: string }): void => {
    browser.localStorage?.setItem('access_token', tokens.access_token);
    browser.localStorage?.setItem('refresh_token', tokens.refresh_token);
  },

  clearTokens: (): void => {
    browser.localStorage?.removeItem('access_token');
    browser.localStorage?.removeItem('refresh_token');
    browser.localStorage?.removeItem('user');
  }
};
