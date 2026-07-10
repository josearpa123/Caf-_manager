/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@coffee-manager/shared-types',
    '@coffee-manager/validation-schemas',
  ],
};

export default nextConfig;
