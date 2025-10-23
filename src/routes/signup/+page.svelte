<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
  
	// Reactive form state
	let email = '';
	let password = '';
	let confirmPassword = '';
	let error: string | null = null;
  
	async function signUp() {
	  error = null;
  
	  if (!email || !password || !confirmPassword) {
		error = 'Please fill in all fields.';
		return;
	  }
  
	  if (!email.includes('@')) {
		error = 'Please enter a valid email address.';
		return;
	  }
  
	  if (password !== confirmPassword) {
		error = 'Passwords do not match.';
		return;
	  }
  
	  const { data, error: e } = await supabase.auth.signUp({
		email,
		password
	  });
  
	  if (e) {
		error = e.message;
		return;
	  }
  
	  if (!data.user) {
		error = 'Sign-up failed. User not created.';
		return;
	  }
  
	  // Insert profile with email as username
	  const { error: profileError } = await supabase
		.from('profiles')
		.insert({ id: data.user.id, username: email });
  
	  if (profileError) {
		error = profileError.message;
		return;
	  }
  
	  goto('/login');
	}
  
	function goBackToLogin() {
	  goto('/login');
	}
  </script>
  
  <main class="login-page">
	<div class="login-card">
	  <h1 class="logo">CHRONOS</h1>
  
	  <label for="email">Email</label>
	  <input id="email" type="email" placeholder="example@email.com" bind:value={email} />
  
	  <label for="password">Password</label>
	  <input id="password" type="password" placeholder="*************" bind:value={password} />
  
	  <label for="confirm-password">Confirm Password</label>
	  <input id="confirm-password" type="password" placeholder="*************" bind:value={confirmPassword} />
  
	  <button class="log-in-btn" on:click={signUp}>SIGN UP</button>
	  <button class="log-in-btn secondary" on:click={goBackToLogin}>BACK TO LOGIN</button>
  
	  {#if error}
		<p class="error" aria-live="polite">{error}</p>
	  {/if}
  
	  <p class="signup-text">
		Already have an account? <a href="/login">Log in</a>
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
		background: linear-gradient(160deg, #2a3648 0%, #323e55 100%);
		color: #f6d7b0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.login-card {
		background: #2a3648;
		padding: 3rem 2.5rem;
		border-radius: 16px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
		width: 420px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.logo {
		font-family: Georgia, serif;
		font-size: 2.5rem;
		letter-spacing: 0.08em;
		color: #d8a15c;
		margin-bottom: 2rem;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	label {
		align-self: flex-start;
		font-size: 1rem;
		font-weight: 600;
		color: #f6d7b0;
		margin-bottom: 0.3rem;
	}

	input {
		width: 100%;
		height: 48px;
		padding: 0 1rem;
		border: none;
		border-radius: 8px;
		margin-bottom: 1.2rem;
		font-size: 1rem;
		background: #f6d7b0;
		color: #323e55;
		transition: all 0.3s ease;
	}

	input::placeholder {
		color: #7a6c58;
	}

	input:focus {
		outline: none;
		background: #fff;
		box-shadow: 0 0 0 3px rgba(216, 161, 92, 0.4);
	}

	.log-in-btn {
		width: 100%;
		background: #d8a15c;
		color: #323e55;
		font-weight: 600;
		border: none;
		border-radius: 8px;
		padding: 0.75rem;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-top: 0.5rem;
	}

	.log-in-btn:hover {
		background: #f0b868;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.log-in-btn.secondary {
		background: #f6d7b0;
		color: #2a3648;
		margin-top: 0.6rem;
	}

	.log-in-btn.secondary:hover {
		background: #f8e5c7;
	}

	.error {
		color: #ffb4a2;
		background: rgba(255, 0, 0, 0.1);
		border: 1px solid rgba(255, 0, 0, 0.3);
		padding: 0.6rem 1rem;
		border-radius: 8px;
		margin-top: 1rem;
		font-size: 0.9rem;
		width: 100%;
		text-align: center;
	}

	.signup-text {
		margin-top: 1.5rem;
		font-size: 0.9rem;
		color: #f6d7b0;
	}

	.signup-text a {
		color: #d8a15c;
		font-weight: bold;
		text-decoration: none;
	}

	.signup-text a:hover {
		text-decoration: underline;
	}

	@media (max-width: 480px) {
		.login-card {
			width: 90%;
			padding: 2rem;
		}

		.logo {
			font-size: 2rem;
		}
	}
</style>
