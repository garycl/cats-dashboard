import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled'
          ],
          'charts-vendor': ['d3', 'd3-sankey', 'recharts'],
          'maps-vendor': ['maplibre-gl', 'react-map-gl'],
          // Large individual components
          'airport-map': ['./src/components/Maps/AirportMap.tsx'],
          'airport-comparison': ['./src/pages/AirportComparison.tsx']
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@mui/icons-material'
    ]
  },
  define: {
    // This ensures compatibility with some libraries that expect process.env
    global: 'globalThis',
  }
})