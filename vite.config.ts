import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { localAssessmentPlugin } from './vite.local-assessment';

export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'');
  return {plugins:[react(),tailwindcss(),localAssessmentPlugin(env.OPENAI_API_KEY||'',env.GEMINI_API_KEY||'')]};
});
