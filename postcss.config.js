// postcss.config.js
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},

    // nesting for CSS nesting support
    "postcss-nesting": {},

    // Convert OKLab/OKLCH → RGB (Chrome 92 safe)
    "@csstools/postcss-oklab-function": {
      preserve: false
    },

    // Fix cascade layers for older browsers
    "@csstools/postcss-cascade-layers": {},

    autoprefixer: {}
  }
};