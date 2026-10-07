const BACKEND = process.env.BACKEND_URL || 'http://localhost:5000';
module.exports = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/api/:path*', destination: `${BACKEND}/api/:path*` },
      ],
    };
  },
};
