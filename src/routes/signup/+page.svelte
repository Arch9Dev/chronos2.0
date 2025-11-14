<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	// Reactive form state
	let email = '';
	let password = '';
	let confirmPassword = '';
	let error: string | null = null;
	let showPassword = false;
	let showConfirmPassword = false;

	async function signUp() {
		error = null;

		// Validation
		if (!email || !password || !confirmPassword) {
			error = 'Please fill in all fields.';
			return;
		}

		if (!email.includes('@')) {
			error = 'Please enter a valid email address.';
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters long.';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match.';
			return;
		}

		// Sign up user
		const { data, error: signUpError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${window.location.origin}/login`
			}
		});

		if (signUpError) {
			console.error('Signup error:', signUpError);
			error = signUpError.message;
			return;
		}

		// Handle email confirmation
		if (data.user && data.user.identities && data.user.identities.length === 0) {
			error = 'An account with this email already exists.';
			return;
		}

		// Success - redirect based on confirmation setting
		if (data.user && !data.user.confirmed_at) {
			error = 'Success! Please check your email to confirm your account.';
			// Don't redirect yet
		} else {
			goto('/login');
		}
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
		<div class="password-wrapper">
			<input
				id="password"
				type={showPassword ? 'text' : 'password'}
				placeholder="*************"
				bind:value={password}
			/>
			<button
				type="button"
				class="toggle-password"
				on:click={() => (showPassword = !showPassword)}
				aria-label={showPassword ? 'Hide password' : 'Show password'}
			>
				{#if showPassword}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
						<line x1="1" y1="1" x2="23" y2="23" />
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
						<circle cx="12" cy="12" r="3" />
					</svg>
				{/if}
			</button>
		</div>

		<label for="confirm-password">Confirm Password</label>
		<div class="password-wrapper">
			<input
				id="confirm-password"
				type={showConfirmPassword ? 'text' : 'password'}
				placeholder="*************"
				bind:value={confirmPassword}
			/>
			<button
				type="button"
				class="toggle-password"
				on:click={() => (showConfirmPassword = !showConfirmPassword)}
				aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
			>
				{#if showConfirmPassword}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
						<line x1="1" y1="1" x2="23" y2="23" />
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
						<circle cx="12" cy="12" r="3" />
					</svg>
				{/if}
			</button>
		</div>

		<button class="log-in-btn" on:click={signUp}>SIGN UP</button>
		<button class="log-in-btn secondary" on:click={goBackToLogin}>BACK TO LOGIN</button>

		{#if error}
			<p class="error" aria-live="polite">{error}</p>
		{/if}

		<p class="signup-text">
			Already have an account? <a href="/login">Log in</a>
		</p>
	</div>
	<div class="home">
		<a href="/" class="home-btn">Home</a>
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

	.password-wrapper {
		width: 100%;
		position: relative;
		margin-bottom: 1.2rem;
	}

	.password-wrapper input {
		margin-bottom: 0;
		padding-right: 3rem;
	}

	.toggle-password {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: #7a6c58;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s ease;
	}

	.toggle-password:hover {
		color: #323e55;
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

	.home-btn {
		position: fixed;
		top: 1rem;
		left: 1rem;
		background: #d8a15c;
		color: #323e55;
		font-weight: 600;
		border: none;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		font-size: 1.5rem;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
		z-index: 1000;
	}

	.home-btn:hover {
		background: #f8e5c7;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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