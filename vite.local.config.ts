import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { localAssessmentPlugin } from './vite.local-assessment.ts';

export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'');
  const stripTailwindImport:Plugin={
    name:'local-css-without-native-tailwind',
    enforce:'pre',
    transform(code,id){return id.replace(/\\/g,'/').endsWith('/src/styles.css')?code.replace('@import "tailwindcss";',''):null},
  };
  return {plugins:[react(),stripTailwindImport,localAssessmentPlugin(env.OPENAI_API_KEY||'',env.GEMINI_API_KEY||'')]};
});
