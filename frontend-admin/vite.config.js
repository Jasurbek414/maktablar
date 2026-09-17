import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/spd/', // superadmin panel maktab.ecos.uz/spd ostida joylashadi
  plugins: [
    tailwindcss(),
    react(),
  ],
})
