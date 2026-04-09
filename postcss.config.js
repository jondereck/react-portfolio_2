const plugins = {
  tailwindcss: {},
};

try {
  require.resolve('autoprefixer');
  plugins.autoprefixer = {};
} catch (error) {
  console.warn(
    'Autoprefixer is not installed; continuing without vendor prefixing. Install it with "npm install -D autoprefixer" when you regain registry access.'
  );
}

module.exports = { plugins };
