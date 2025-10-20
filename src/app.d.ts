/// <reference types="@sveltejs/kit" />

declare global {
	namespace App {
	  // interface Error {}
	  // interface Locals {}
	  // interface PageData {}
	  // interface Platform {}
	}
  
	interface ImportMetaEnv {
	  readonly VITE_SUPABASE_URL: string;
	  readonly VITE_SUPABASE_ANON_KEY: string;
	}
  
	interface ImportMeta {
	  readonly env: ImportMetaEnv;
	}
  }
  
  export {};