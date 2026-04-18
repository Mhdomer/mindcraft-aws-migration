/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a standalone bundle for Docker — only the files needed to run,
  // no dev dependencies. Cuts the final image size significantly.
  output: 'standalone',
};

module.exports = nextConfig;


