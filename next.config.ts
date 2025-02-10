import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
export const config = {
  transpilePackages: ['chart.js'],
  webpack: (config: { externals: unknown[]; }) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};

Object.assign(nextConfig, config);