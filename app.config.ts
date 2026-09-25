import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = process.env.APP_VARIANT;
  if (variant && !['development', 'preview', 'production'].includes(variant)) {
    throw new Error('APP_VARIANT must be development, preview, or production.');
  }
  const development = variant === 'development';
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const release = variant === 'preview' || variant === 'production' || process.env.EAS_BUILD === 'true';
  if (release) {
    if (development) throw new Error('Remote builds must not use development network exceptions.');
    if (!apiUrl) throw new Error('Set EXPO_PUBLIC_API_URL to a reachable HTTPS backend URL before a release build.');
    const url = new URL(apiUrl);
    const host = url.hostname.toLowerCase();
    // A public DNS hostname avoids accidentally shipping an emulator or LAN address.
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
        !host.includes('.') || host.endsWith('.local') || host.endsWith('.localhost') ||
        host.endsWith('.internal') || host.endsWith('.test') || host.endsWith('.invalid') ||
        /(^|\.)example\.(com|org|net)$/.test(host) || host.includes(':') || /^[\d.]+$/.test(host)) {
      throw new Error('Preview and production require a public HTTPS API hostname, without credentials or placeholders.');
    }
  }

  return {
    ...config,
    name: config.name ?? 'Calculator',
    slug: config.slug ?? 'calculadora-mobile',
    platforms: ['ios', 'android'],
    plugins: [...(config.plugins ?? []), ['./plugins/with-local-network.js', { development }]],
  };
};
