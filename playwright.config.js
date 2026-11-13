import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'browser.spec.js',outputDir:'./test-results',workers:1,use:{channel:'msedge',headless:true,viewport:{width:1440,height:1080}}});
