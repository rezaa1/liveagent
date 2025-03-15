/// <reference types="vite/client" />

// Add any additional type definitions here
// For example, if you have custom environment variables:
interface ImportMetaEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

#### `frontend/tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```
