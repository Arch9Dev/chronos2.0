<script lang="ts">
</script>

<div class="landing-container">
  <nav class="navbar">
    <div class="nav-container">
    </div>
  </nav>

  <section class="disclaimer-section">
    <div class="section-container">
      <div class="disclaimer-content">
        <div class="feather-decoration">
          <img src="/featherlight.svg" alt="Decorative feather" />
        </div>
        
        <h1>CHRONOS</h1>
        <h2>University Project Disclaimer</h2>
        
        <div class="disclaimer-text">
          <p>
            Thank you for your interest in Chronos. We appreciate you taking the time to explore our application.
          </p>
          
          <p>
            <strong>Please note:</strong> Chronos is a university project created for educational purposes as part of our academic coursework. This application is <strong>not intended for commercial use</strong> and has <strong>no monetary value</strong>.
          </p>
          
          <p>
            While we've designed pricing tiers to demonstrate a complete product experience, no actual payments will be processed, and no charges will be incurred. All features are available for evaluation and testing purposes only.
          </p>
          
          <p>
            This project serves as a demonstration of our technical skills, design capabilities, and understanding of modern web application development. We hope you find it useful and informative.
          </p>
          
          <p class="disclaimer-note">
            If you have any questions about this project, please feel free to contact us through the contact form on our main page.
          </p>
        </div>
        
        <div class="button-group">
          <a href="/" class="back-button">
            <span class="arrow">←</span> Back to Home
          </a>
          <a href="/login" class="continue-button">
            Continue to App
          </a>
        </div>
      </div>
    </div>
  </section>

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
    justify-content: flex-end;
    align-items: center;
  }


  /* LAYOUT */
  .landing-container {
    background: #323E55;
    min-height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .section-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  /* DISCLAIMER SECTION */
  .disclaimer-section {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8rem 2rem 4rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .disclaimer-content {
    background: #2a3648;
    border-radius: 20px;
    padding: 3rem;
    box-shadow: 0 20px 60px #00000033;
    border: 1px solid #D8A15C33;
    position: relative;
    overflow: hidden;
  }

  .feather-decoration {
    position: absolute;
    top: -50px;
    right: -50px;
    opacity: 0.1;
    transform: rotate(45deg);
    pointer-events: none;
  }

  .feather-decoration img {
    height: 300px;
    width: auto;
    filter: brightness(1.5);
  }

  .disclaimer-content h1 {
    font-family: "Georgia", serif;
    font-size: clamp(3rem, 8vw, 4.5rem);
    font-weight: 700;
    text-align: center;
    margin-bottom: 0.5rem;
    letter-spacing: 0.15em;
    color: #D8A15C;
    text-shadow: 0 4px 20px #0000004d;
    position: relative;
    z-index: 2;
  }

  .disclaimer-content h2 {
    font-family: "Georgia", serif;
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 600;
    text-align: center;
    margin-bottom: 2.5rem;
    color: #8EAEBB;
    position: relative;
    z-index: 2;
  }

  .disclaimer-text {
    position: relative;
    z-index: 2;
  }

  .disclaimer-text p {
    font-size: 1.1rem;
    line-height: 1.8;
    color: #F6D7B0;
    margin-bottom: 1.5rem;
  }

  .disclaimer-text strong {
    color: #D8A15C;
    font-weight: 600;
  }

  .disclaimer-note {
    background: #323E55;
    border-left: 4px solid #D8A15C;
    padding: 1.25rem 1.5rem;
    border-radius: 8px;
    margin-top: 2rem;
    font-style: italic;
  }

  /* BUTTONS */
  .button-group {
    display: flex;
    gap: 1rem;
    margin-top: 3rem;
    position: relative;
    z-index: 2;
  }

  .back-button,
  .continue-button {
    flex: 1;
    padding: 1.1rem 2rem;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: 600;
    text-decoration: none;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .back-button {
    background: transparent;
    color: #D8A15C;
    border: 2px solid #D8A15C;
  }

  .back-button:hover {
    background: #D8A15C;
    color: #323E55;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px #D8A15C66;
  }

  .continue-button {
    background: linear-gradient(135deg, #D8A15C 0%, #D8A15C 100%);
    color: #323E55;
    border: none;
  }

  .continue-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px #D8A15C80;
  }

  .arrow {
    font-size: 1.3rem;
    transition: transform 0.3s ease;
  }

  .back-button:hover .arrow {
    transform: translateX(-4px);
  }

  /* FOOTER */
  .footer {
    background: #323E55;
    padding: 2rem;
    text-align: center;
    color: #8EAEBB;
    font-size: 0.9rem;
    margin-top: auto;
  }

  /* RESPONSIVE DESIGN */
  @media (max-width: 768px) {
    .disclaimer-section {
      padding: 6rem 1rem 3rem;
    }

    .disclaimer-content {
      padding: 2rem 1.5rem;
    }

    .button-group {
      flex-direction: column;
    }

    .disclaimer-text p {
      font-size: 1rem;
    }

    .feather-decoration {
      opacity: 0.05;
    }
  }

  @media (max-width: 480px) {
    .nav-container {
      padding: 1rem;
    }

    .disclaimer-content h1 {
      margin-bottom: 0.3rem;
    }

    .disclaimer-content h2 {
      margin-bottom: 2rem;
    }
  }
</style>