<script lang="ts">
  import { supabase } from '$lib/supabase';
  
  let name = '';
  let email = '';
  let message = '';
  let isSubmitting = false;
  let submitStatus = '';

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !message.trim()) {
      submitStatus = 'Please fill in all fields';
      return;
    }

    isSubmitting = true;
    submitStatus = '';

    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .insert([
          {
            name: name.trim(),
            email: email.trim(),
            message: message.trim()
          }
        ]);

      if (error) {
        throw error;
      }

      submitStatus = 'Message sent successfully! We\'ll get back to you soon.';
      name = '';
      email = '';
      message = '';
      
    } catch (error) {
      console.error('Error sending message:', error);
      submitStatus = 'Failed to send message. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<nav class="navbar">
  <div class="nav-container">
    <div class="nav-links">
      <button on:click={() => scrollToSection("home")}>Home</button>
      <button on:click={() => scrollToSection("features")}>Features</button>
      <button on:click={() => scrollToSection("pricing")}>Pricing</button>
      <button on:click={() => scrollToSection("contact")}>Contact</button>
    </div>
    <div class="nav-logo">
      <img src="/logo.svg" alt="Chronos Logo" />
    </div>
  </div>
</nav>

<div class="landing-container" id="home">
  <!-- HERO SECTION -->
  <section class="hero">
    <div class="feather-left">
      <img src="/featherlight.svg" alt="Decorative feather" />
    </div>
    <div class="hero-content">
      <h1>CHRONOS</h1>
      <p class="tagline">Turning chaos into clarity</p>
      <a class="cta-button" href="/login">Begin Your Journey</a>
    </div>
    <div class="feather-right">
      <img src="/featherlight.svg" alt="Decorative feather" />
    </div>
  </section>

  <!-- FEATURES SECTION -->
  <section id="features" class="content-section features-section">
    <div class="section-container">
      <h2>Powerful Features</h2>
      <p class="section-subtitle">Everything you need to master your time</p>
      
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">📅</div>
          <h3>Calendar-Centric Tasks</h3>
          <p>Manage tasks directly from your calendar with seamless integration and intuitive controls</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">✓</div>
          <h3>Progress Tracking</h3>
          <p>Mark tasks as complete and visualize your productivity with real-time progress indicators</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">✨</div>
          <h3>Simple Task Creation</h3>
          <p>Create tasks with titles, tags, and deadlines in seconds with our streamlined interface</p>
        </div>
      </div>
    </div>
  </section>

  <!-- PRICING SECTION -->
  <section id="pricing" class="content-section pricing-section">
    <div class="section-container">
      <h2>Simple, Transparent Pricing</h2>
      <p class="section-subtitle">Choose the plan that works for you</p>
      
      <div class="pricing-grid">
        <div class="price-card">
          <div class="plan-name">Free</div>
          <div class="price">
            <span class="currency">$</span>
            <span class="amount">0</span>
            <span class="period">/month</span>
          </div>
          <ul class="features-list">
            <li>Limited to 1 calendar</li>
            <li>Unlimited task creation</li>
            <li>Multi-platform access</li>
          </ul>
          <a href="/disclaimer" class="plan-button primary">Get Started</a>
        </div>

        <div class="price-card featured">
          <div class="featured-badge">Popular</div>
          <div class="plan-name">Pro</div>
          <div class="price">
            <span class="currency">$</span>
            <span class="amount">9</span>
            <span class="period">/month</span>
          </div>
          <ul class="features-list">
            <li>Unlimited calendars</li>
            <li>Unlimited task creation</li>
            <li>Multi-platform access</li>
            <li>Priority support</li>
          </ul>
          <a href="/disclaimer" class="plan-button primary">Get Started</a>
        </div>

        <div class="price-card">
          <div class="plan-name">Teams</div>
          <div class="price">
            <span class="amount-text">Custom</span>
          </div>
          <ul class="features-list">
            <li>All Pro features</li>
            <li>Share calendars</li>
            <li>Create teams</li>
            <li class="coming-soon">Coming soon</li>
          </ul>
          <a href="/disclaimer" class="plan-button primary">Get Started</a>
        </div>
      </div>
    </div>
  </section>

  <!-- CONTACT SECTION -->
  <section id="contact" class="content-section contact-section">
    <div class="section-container">
      <h2>Get in Touch</h2>
      <p class="section-subtitle">Have questions? We'd love to hear from you</p>
      
      <form class="contact-form" on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label for="name">Name</label>
          <input 
            id="name"
            type="text" 
            placeholder="John Doe" 
            bind:value={name}
            disabled={isSubmitting}
            required 
          />
        </div>
        
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            id="email"
            type="email" 
            placeholder="john@example.com" 
            bind:value={email}
            disabled={isSubmitting}
            required 
          />
        </div>
        
        <div class="form-group">
          <label for="message">Message</label>
          <textarea 
            id="message"
            placeholder="Tell us what's on your mind..." 
            bind:value={message}
            disabled={isSubmitting}
            required
          ></textarea>
        </div>
        
        <button type="submit" class="submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </button>
        
        {#if submitStatus}
          <div class="status-message" class:success={submitStatus.includes('success')} class:error={!submitStatus.includes('success')}>
            {submitStatus}
          </div>
        {/if}
      </form>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <p>&copy; 2025 Chronos. All rights reserved.</p>
  </footer>
</div>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* NAVIGATION */
  .navbar {
    position: fixed;
    top: 0;
    width: 100%;
    background: #D8A15C;
    backdrop-filter: blur(10px);
    z-index: 1000;
    box-shadow: 0 2px 20px #00000019;
  }

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.25rem 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  .nav-logo {
    position: fixed;
    right: 2rem;
    top: 1.25rem;
  }

  .nav-logo img {
    height: 30px;
    width: auto;
  }

  .nav-links {
    display: flex;
    gap: 2.5rem;
  }

  .nav-links button {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 2rem;
    font-weight: 500;
    background: none;
    border: none;
    color: #323E55;
    cursor: pointer;
    transition: color 0.2s ease;
    position: relative;
    padding-bottom: 4px;
  }

  .nav-links button::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background: #323E55;
    transition: width 0.3s ease;
  }

  .nav-links button:hover::after {
    width: 100%;
  }

  /* LAYOUT */
  .landing-container {
    background: #323E55;
    min-height: 100vh;
    width: 100%;
  }

  .section-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  /* HERO SECTION */
  .hero {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    text-align: center;
    position: relative;
    padding: 0 2rem;
  }

  .feather-left,
  .feather-right {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
  }

  .feather-left {
    left: 5%;
  }

  .feather-right {
    right: 5%;
    transform: translateY(-50%) scaleX(-1);
  }

  .feather-left img,
  .feather-right img {
    height: 60vh;
    width: auto;
    opacity: 0.6;
    filter: brightness(1.2);
  }

  .hero-content {
    z-index: 2;
    position: relative;
  }

  .hero-content h1 {
    font-family: "Georgia", serif;
    font-size: clamp(4rem, 12vw, 10rem);
    font-weight: 700;
    margin-bottom: 1.5rem;
    letter-spacing: 0.15em;
    color: #D8A15C;
    text-shadow: 0 4px 20px #0000004d;
  }

  .tagline {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: clamp(1.1rem, 2vw, 1.5rem);
    font-weight: 400;
    display: block;
    margin-bottom: 3rem;
    letter-spacing: 0.05em;
    color: #F6D7B0;
    opacity: 0.95;
  }

  .cta-button {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 1.1rem;
    font-weight: 600;
    background: linear-gradient(135deg, #D8A15C 0%, #D8A15C 100%);
    color: #323E55;
    padding: 1.1rem 3rem;
    border-radius: 50px;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: inline-block;
    box-shadow: 0 8px 30px #D8A15C66;
  }
  
  .cta-button:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 40px #D8A15C80;
  }

  /* CONTENT SECTIONS */
  .content-section {
    padding: 6rem 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .content-section h2 {
    font-family: "Georgia", serif;
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 600;
    margin-bottom: 1rem;
    color: #D8A15C;
    text-align: center;
  }

  .section-subtitle {
    text-align: center;
    font-size: 1.2rem;
    color: #8EAEBB;
    margin-bottom: 4rem;
    font-weight: 400;
  }

  /* FEATURES SECTION */
  .features-section {
    background: #323E55;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2.5rem;
    margin-top: 3rem;
  }

  .feature-card {
    background: #2a3648;
    border-radius: 16px;
    padding: 2.5rem 2rem;
    text-align: center;
    transition: all 0.3s ease;
    border: 1px solid #D8A15C1a;
  }

  .feature-card:hover {
    transform: translateY(-8px);
    border-color: #D8A15C4d;
    box-shadow: 0 20px 50px #0000004d;
  }

  .feature-icon {
    font-size: 3rem;
    margin-bottom: 1.5rem;
  }

  .feature-card h3 {
    font-size: 1.4rem;
    font-weight: 600;
    color: #D8A15C;
    margin-bottom: 1rem;
  }

  .feature-card p {
    font-size: 1rem;
    line-height: 1.7;
    color: #F6D7B0;
  }

  /* PRICING SECTION */
  .pricing-section {
    background: #323E55;
  }

  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    max-width: 1000px;
    margin: 0 auto;
  }

  .price-card {
    background: white;
    padding: 2.5rem 2rem;
    border-radius: 16px;
    box-shadow: 0 10px 40px #00000026;
    transition: all 0.3s ease;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .price-card.featured {
    border: 2px solid #D8A15C;
    transform: scale(1.05);
  }

  .price-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 60px #00000033;
  }

  .price-card.featured:hover {
    transform: scale(1.05) translateY(-8px);
  }

  .featured-badge {
    position: absolute;
    top: -12px;
    right: 20px;
    background: linear-gradient(135deg, #D8A15C 0%, #D8A15C 100%);
    color: white;
    padding: 0.4rem 1.2rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .plan-name {
    font-family: "Georgia", serif;
    font-size: 1.5rem;
    font-weight: 600;
    color: #323E55;
    margin-bottom: 1.5rem;
  }

  .price {
    margin-bottom: 2rem;
    display: flex;
    align-items: baseline;
    justify-content: center;
  }

  .currency {
    font-size: 1.5rem;
    color: #323E55;
    font-weight: 600;
  }

  .amount {
    font-size: 4rem;
    font-weight: 700;
    color: #323E55;
    line-height: 1;
  }

  .period {
    font-size: 1rem;
    color: #8EAEBB;
    margin-left: 0.3rem;
  }

  .amount-text {
    font-size: 2.5rem;
    font-weight: 700;
    color: #323E55;
  }

  .features-list {
    list-style: none;
    margin-bottom: 2rem;
    flex-grow: 1;
  }

  .features-list li {
    padding: 0.75rem 0;
    color: #323E55;
    font-size: 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .features-list li:last-child {
    border-bottom: none;
  }

  .features-list li.coming-soon {
    color: #8EAEBB;
    font-style: italic;
    font-size: 0.9rem;
  }

  .plan-button {
    width: 100%;
    padding: 1rem;
    border-radius: 8px;
    border: none;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .plan-button.primary {
    background: linear-gradient(135deg, #D8A15C 0%, #D8A15C 100%);
    color: white;
  }

  .plan-button.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px #D8A15C66;
  }

  /* CONTACT SECTION */
  .contact-section {
    background: #323E55;
  }

  .contact-form {
    max-width: 600px;
    margin: 0 auto;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #D8A15C;
    font-weight: 500;
    font-size: 0.95rem;
  }

  .contact-form input,
  .contact-form textarea {
    width: 100%;
    padding: 1rem 1.25rem;
    border-radius: 10px;
    border: 2px solid #D8A15C33;
    background: #f9f7f4;
    color: #323E55;
    font-size: 1rem;
    font-family: inherit;
    transition: all 0.3s ease;
  }

  .contact-form input::placeholder,
  .contact-form textarea::placeholder {
    color: #323E5580;
  }

  .contact-form input:focus,
  .contact-form textarea:focus {
    outline: none;
    border-color: #D8A15C;
    background: #faf8f6;
  }

  .contact-form input:disabled,
  .contact-form textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .contact-form textarea {
    min-height: 150px;
    resize: vertical;
  }

  .submit-button {
    width: 100%;
    padding: 1.1rem;
    background: linear-gradient(135deg, #D8A15C 0%, #D8A15C 100%);
    color: white;
    font-size: 1.1rem;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 0.5rem;
  }

  .submit-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px #D8A15C66;
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .status-message {
    margin-top: 1.5rem;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
    font-weight: 500;
  }

  .status-message.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .status-message.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  /* FOOTER */
  .footer {
    background: #323E55;
    padding: 2rem;
    text-align: center;
    color: #8EAEBB;
    font-size: 0.9rem;
  }

  /* RESPONSIVE DESIGN */
  @media (max-width: 1200px) {
    .feather-left,
    .feather-right {
      opacity: 0.3;
    }
  }

  @media (max-width: 768px) {
    .feather-left,
    .feather-right {
      display: none;
    }

    .nav-container {
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }

    .nav-links {
      gap: 1.5rem;
    }

    .features-grid,
    .pricing-grid {
      grid-template-columns: 1fr;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }

    .price-card.featured {
      transform: scale(1);
    }

    .price-card.featured:hover {
      transform: translateY(-8px);
    }

    .content-section {
      padding: 4rem 0;
    }
  }

  @media (max-width: 480px) {
    .nav-links {
      gap: 1rem;
    }

    .nav-links button {
      font-size: 0.85rem;
    }

    .section-subtitle {
      font-size: 1rem;
    }
  }
</style>