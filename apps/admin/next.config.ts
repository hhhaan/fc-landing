import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    async redirects() {
        return [{ source: '/billing', destination: '/revenue', permanent: true }];
    },
};

export default nextConfig;
