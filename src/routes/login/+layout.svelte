<script lang="ts">
    // This layout is specific for login pages
  </script>
  
  <slot />
  
  <style>
    /* This ensures no navbar or extra padding from global layout */
    :global(body) {
      margin: 0;
      padding: 0;
    }
  
    /* Optional: Smooth scrolling */
  </style>
  