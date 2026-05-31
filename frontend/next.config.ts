import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    env: {
        JWT_SECRET: process.env.JWT_SECRET,
        DB_HOST: process.env.DB_HOST,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
        NEXT_PUBLIC_HCAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY,
    },
};

export default nextConfig;