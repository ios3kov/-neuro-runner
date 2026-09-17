module.exports = {
  content: ['./index.html', './App.tsx', './components/**/*.{ts,tsx}', './data/**/*.ts'],
  theme: { extend: {
    colors: { cyan: { 400: '#00f0ff', 500: '#00d8ff', 900: '#003135', 950: '#001a1c' } },
    fontFamily: { mono: ['"Share Tech Mono"', 'monospace'], code: ['"JetBrains Mono"', 'monospace'] }
  } },
  plugins: [require('tailwindcss-animate')]
};
