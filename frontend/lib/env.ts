export const env = {
    JWT_SECRET: process.env.JWT_SECRET ?? "novelsive_secret_change_this_later",
    DB_HOST: process.env.DB_HOST ?? "localhost",
    DB_USER: process.env.DB_USER ?? "root",
    DB_PASSWORD: process.env.DB_PASSWORD ?? "",
    DB_NAME: process.env.DB_NAME ?? "novelsive",
    EMAIL_USER: process.env.EMAIL_USER ?? "",
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ?? "",
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000",
    BACKEND_URL: process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000",
    HCAPTCHA_SECRET_KEY: process.env.HCAPTCHA_SECRET_KEY ?? "",
    
};

