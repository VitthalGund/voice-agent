/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Ensure we can use environmental variables on the client side if prefixed with NEXT_PUBLIC_
};

module.exports = nextConfig;
