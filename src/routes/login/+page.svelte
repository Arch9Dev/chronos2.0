<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';

  // Svelte 5 runes
  let email = $state('');
  let password = $state('');
  let error = $state<string | null>(null);

    async function signIn() {
    error = null;
    
    // Client-side validation
    if (!email || !password) {
      error = 'Please enter both email and password.';
      return;
    }
    
    if (!email.includes('@')) {
      error = 'Please enter a valid email address.';
      return;
    }
    
    const { error: e } = await supabase.auth.signInWithPassword({ email, password });
    if (e) {
      error = 'Invalid email or password.';
      return;
    }
    goto('/calendar');
  }

  function goHome() {
    goto('/');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      signIn();
    }
  }
</script>

<main class="login-page">
  <div class="login-card">
    <h1>CHRONOS</h1>

    <label for="email">Email</label>
    <input
      id="email"
      type="email"
      placeholder="example@email.com"
      bind:value={email}
      
    />

    <label for="password">Password</label>
    <input
      id="password"
      type="password"
      placeholder="*************"
      bind:value={password}
      onkeydown={handleKeydown}
    />

    <button class="log-in-btn" onclick={signIn}>LOG IN</button>

    {#if error}
      <p class="error" aria-live="polite">{error}</p>
    {/if}

    <p class="signup-text">
      Don't have an account? <a href="signup">Sign up</a>
    </p>
  </div>
</main>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  .login-page {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-image: url("/Bg.svg");
    font-family: "Segoe UI", sans-serif;
    position: relative;
    overflow: hidden;
  }


  .login-card {
    background: rgba(249, 248, 244, 0.95);
    padding: 2.5rem;
    border-radius: 1rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    width: 800px;
    height: 652px;
    text-align: center;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    z-index: 5;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .login-card h1 {
    font-family: "Times New Roman", serif;
    font-size: 48px;
    font-weight: bold;
    margin-bottom: 2rem;
    color: #1a1a1a;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  }

  label {
    display: block;
    text-align: left;
    margin-bottom: 0.3rem;
    font-weight: 600;
    color: #1a1a1a;
    font-size: 33px;
    width: 639px;
  }

  input {
    width: 639px;
    height: 66px;
    padding: 0 1rem;
    border: 2px solid #ccc;
    border-radius: 0.4rem;
    margin-bottom: 1.2rem;
    font-size: 16px;
    background: rgba(255, 255, 255, 0.9);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: #2d4a6b;
    box-shadow: 0 0 0 3px rgba(45, 74, 107, 0.1);
  }

  input::placeholder {
    color: #999;
  }

  .log-in-btn {
    width: 300px;
    height: 66px;
    border: 2px solid #1a1a1a;
    border-radius: 0.4rem;
    background: white;
    font-family: "Times New Roman", serif;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 1rem;
    text-decoration: none;
    display: inline-block;
    box-sizing: border-box;
  }

  .log-in-btn:hover {
    background-color: #1a1a1a;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(26, 26, 26, 0.3);
  }

  .log-in-btn:active {
    transform: translateY(0);
  }

  .signup-text {
    margin-top: 1rem;
    font-size: 14px;
    color: #555;
  }

  .signup-text a {
    color: #2d4a6b;
    font-weight: bold;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .signup-text a:hover {
    color: #1a2745;
    text-decoration: underline;
  }

  .error {
    color: #d32f2f;
    margin-top: 0.5rem;
    margin-bottom: 1rem;
    font-size: 14px;
    padding: 0.5rem;
    background: rgba(211, 47, 47, 0.1);
    border-radius: 0.3rem;
    border: 1px solid rgba(211, 47, 47, 0.3);
  }

  /* Responsive design */
  @media (max-width: 880px) {
    .login-card {
      width: 90%;
      height: auto;
      padding: 2rem;
      margin: 1rem;
    }

    label {
      width: 100%;
      font-size: 24px;
    }

    input {
      width: 100%;
      height: 50px;
    }

    .log-in-btn {
      width: 80%;
      height: 50px;
    }

  }
</style>