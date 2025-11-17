<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	// Svelte 5 reactive variables
	let email = '';
	let password = '';
	let error: string | null = null;
	let showPassword = false;
	let successMessage: string | null = null;
	let isResettingPassword = false;
	let showResetModal = false;
	let resetEmail = '';

	async function signIn() {
		error = null;

		if (!email || !password) {
			error = 'Please enter both email and password.';
			return;
		}

		if (!email.includes('@')) {
			error = 'Please enter a valid email address.';
			return;
		}

		const { data, error: e } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (e) {
			error = e.message || 'Invalid email or password.';
			return;
		}

		if (!data.session) {
			error = 'Login failed. No session returned.';
			return;
		}

		// Successful login, navigate to calendar page
		goto('/calendar');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			signIn();
		}
	}

	async function resetPassword() {
		error = null;
		successMessage = null;

		if (!resetEmail) {
			error = 'Please enter your email address.';
			return;
		}

		if (!resetEmail.includes('@')) {
			error = 'Please enter a valid email address.';
			return;
		}

		isResettingPassword = true;

		const { error: e } = await supabase.auth.resetPasswordForEmail(resetEmail, {
			redirectTo: `${window.location.origin}/reset-password`
		});

		isResettingPassword = false;

		if (e) {
			error = e.message || 'Failed to send reset email.';
			return;
		}

		successMessage = 'Password reset link sent! Check your email.';
		setTimeout(() => {
			showResetModal = false;
			successMessage = null;
			resetEmail = '';
		}, 3000);
	}

	function openResetModal() {
		showResetModal = true;
		error = null;
		successMessage = null;
		resetEmail = email;
	}

	function closeResetModal() {
		showResetModal = false;
		error = null;
		successMessage = null;
		resetEmail = '';
	}

	function handleResetKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			resetPassword();
		}
		if (event.key === 'Escape') {
			closeResetModal();
		}
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
				on:keydown={handleKeydown}
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

		<button class="log-in-btn" on:click={signIn}>LOG IN</button>

		<button type="button" class="forgot-password-btn" on:click={openResetModal}>
			Forgot Password
		</button>

		{#if error}
			<p class="error" aria-live="polite">{error}</p>
		{/if}

		<p class="signup-text">
			Don't have an account? <a href="/signup">Sign up</a>
		</p>
	</div>
	<div class="home">
		<a href="/" class="home-btn">Home</a>
	</div>

	{#if showResetModal}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-overlay" on:click={closeResetModal}>
			<div class="modal-content" on:click={(e) => e.stopPropagation()}>
				<button class="modal-close" on:click={closeResetModal}>&times;</button>
				<h2>Reset Password</h2>
				<p class="modal-description">Enter your email address and we'll send you a link to reset your password.</p>
				
				<label for="reset-email">Email</label>
				<!-- svelte-ignore a11y_autofocus -->
				<input 
					id="reset-email" 
					type="email" 
					placeholder="example@email.com" 
					bind:value={resetEmail}
					on:keydown={handleResetKeydown}
					autofocus
				/>

				{#if successMessage}
					<p class="success" aria-live="polite">{successMessage}</p>
				{/if}

				{#if error}
					<p class="error" aria-live="polite">{error}</p>
				{/if}

				<button class="modal-submit-btn" on:click={resetPassword} disabled={isResettingPassword}>
					{isResettingPassword ? 'Sending...' : 'Send Reset Link'}
				</button>
			</div>
		</div>
	{/if}
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

	.forgot-password-btn {
		background: none;
		border: none;
		color: #d8a15c;
		font-size: 0.9rem;
		cursor: pointer;
		margin-top: 0.75rem;
		text-decoration: underline;
		transition: color 0.2s ease;
	}

	.forgot-password-btn:hover:not(:disabled) {
		color: #f0b868;
	}

	.forgot-password-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.success {
		color: #a2ffb4;
		background: rgba(0, 255, 0, 0.1);
		border: 1px solid rgba(0, 255, 0, 0.3);
		padding: 0.6rem 1rem;
		border-radius: 8px;
		margin-top: 1rem;
		font-size: 0.9rem;
		width: 100%;
		text-align: center;
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

	.home-btn {
		position: fixed;
		top: 1rem;
		left: 1rem;
		background: #D8A15C;
		color: #323E55;
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

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 2000;
		backdrop-filter: blur(4px);
	}

	.modal-content {
		background: #2a3648;
		padding: 2.5rem;
		border-radius: 16px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
		width: 90%;
		max-width: 420px;
		position: relative;
		border: 1px solid rgba(255, 255, 255, 0.1);
		animation: modalSlideIn 0.3s ease-out;
	}

	@keyframes modalSlideIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.modal-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: none;
		border: none;
		color: #f6d7b0;
		font-size: 2rem;
		cursor: pointer;
		line-height: 1;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s ease;
	}

	.modal-close:hover {
		color: #d8a15c;
	}

	.modal-content h2 {
		color: #d8a15c;
		font-size: 1.75rem;
		margin-bottom: 0.5rem;
		text-align: center;
	}

	.modal-description {
		color: #f6d7b0;
		font-size: 0.9rem;
		text-align: center;
		margin-bottom: 1.5rem;
		line-height: 1.5;
	}

	.modal-content label {
		align-self: flex-start;
		font-size: 1rem;
		font-weight: 600;
		color: #f6d7b0;
		margin-bottom: 0.3rem;
		display: block;
	}

	.modal-content input {
		width: 100%;
		height: 48px;
		padding: 0 1rem;
		border: none;
		border-radius: 8px;
		margin-bottom: 1rem;
		font-size: 1rem;
		background: #f6d7b0;
		color: #323e55;
		transition: all 0.3s ease;
	}

	.modal-submit-btn {
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

	.modal-submit-btn:hover:not(:disabled) {
		background: #f0b868;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.modal-submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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