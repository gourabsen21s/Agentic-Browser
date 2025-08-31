module.exports = {
  content: [
    "./src/renderer/**/*.{html,js,ts}",
    "./src/renderer/components/**/*.{js,ts}"
  ],
  theme: {
    extend: {
      colors: {
        'browser-bg': '#f8fafc',
        'browser-border': '#e2e8f0',
        'tab-active': '#ffffff',
        'tab-inactive': '#f1f5f9'
      },
      fontFamily: {
        'browser': ['system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}