/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sms/shared-types', '@sms/shared-utils', '@sms/shared-ui', '@sms/api-client'],
  experimental: {
    externalDir: true,
  },
}

module.exports = nextConfig
