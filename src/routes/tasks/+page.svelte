<script lang="ts">
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
    import { goto } from '$app/navigation';
  
    let user: any = null;
    let loading = false;
    let error: string | null = null;
    let success = false;
  
    // Form fields
    let title = '';
    let description = '';
    let deadline = '';
    let priorityLevel = '';
    let tags = '';
    let selectedCalendar = '';
    let calendars: any[] = [];
  
    onMount(async () => {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
  
      if (authError || !currentUser) {
        goto('/login');
        return;
      }
  
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUser.id)
        .maybeSingle();
  
      if (profileError) {
        error = profileError.message;
        return;
      }

      if (!profile) {
        console.warn('No profile found for user — redirecting or creating one');
        // optionally create a profile automatically here
      }
  
      user = { ...currentUser, username: profile?.username };
  
      // Fetch user's calendars for dropdown
      const { data: calendarsData, error: fetchError } = await supabase
        .from('calendars')
        .select('id, name')
        .eq('user_id', user.id);
  
      if (fetchError) {
        error = fetchError.message;
        return;
      }
  
      calendars = calendarsData || [];
    });
  
    async function handleSubmit() {
      if (!title.trim()) return (error = 'Title is required');
      if (!deadline) return (error = 'Deadline is required');
      if (!priorityLevel) return (error = 'Priority level is required');
  
      loading = true;
      error = null;
  
      try {
        const deadlineDate = new Date(deadline);
  
        const taskData = {
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          deadline: deadlineDate.toISOString(),
          priority: priorityLevel,
          tags: tags.trim()
            ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
            : [],
          calendar_id: selectedCalendar || null,
          completed: false,
          created_at: new Date().toISOString()
        };
  
        const { error: insertError } = await supabase.from('tasks').insert([taskData]);
  
        if (insertError) throw insertError;
  
        success = true;
        title = description = deadline = priorityLevel = tags = selectedCalendar = '';
  
        // Redirect to calendar to see new task
        setTimeout(() => goto('/calendar'), 1500);
  
      } catch (err: any) {
        error = err?.message || 'Failed to create task';
        console.error('Error creating task:', err);
      } finally {
        loading = false;
      }
    }
  
    function goBack() {
      goto('/calendar');
    }
  
    function getCurrentDateTime() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
  </script>
  
  <main class="task-page">
    <header class="task-header">
      <div class="header-left">
        <button class="back-btn" on:click={goBack} type="button">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 16L6 10L12 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Back to Calendar
        </button>
        <h1>Create New Task</h1>
      </div>
      <img src="/logo.svg" alt="Logo" class="chronos-logo" />
    </header>
  
    <div class="task-container">
      <form on:submit|preventDefault={handleSubmit} class="task-form">
        <div class="form-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="form-icon">
            <path d="M9 11L12 14L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h2>Task Details</h2>
        </div>
  
        {#if error}
          <div class="alert alert-error">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/>
              <path d="M10 6V10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="10" cy="14" r="0.5" fill="currentColor"/>
            </svg>
            {error}
          </div>
        {/if}
  
        {#if success}
          <div class="alert alert-success">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M6 10L9 13L14 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/>
            </svg>
            Task created successfully! Redirecting...
          </div>
        {/if}
  
        <div class="form-grid">
          <div class="form-group full-width">
            <label for="title">
              Task Title <span class="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              bind:value={title}
              placeholder="Enter task title"
              required
              class="form-input"
            />
          </div>
  
          <div class="form-group full-width">
            <label for="description">Description</label>
            <textarea
              id="description"
              bind:value={description}
              placeholder="Add task description (optional)"
              rows="4"
              class="form-textarea"
            ></textarea>
          </div>
  
          <div class="form-group">
            <label for="deadline">
              Deadline <span class="required">*</span>
            </label>
            <input
              type="datetime-local"
              id="deadline"
              bind:value={deadline}
              min={getCurrentDateTime()}
              required
              class="form-input"
            />
          </div>
  
          <div class="form-group">
            <label for="priority">
              Priority Level <span class="required">*</span>
            </label>
            <select
              id="priority"
              bind:value={priorityLevel}
              required
              class="form-select"
            >
              <option value="" disabled selected>Select priority</option>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

  
          <div class="form-group">
            <label for="tags">
              Tags
              <span class="label-hint">(comma-separated)</span>
            </label>
            <input
              type="text"
              id="tags"
              bind:value={tags}
              placeholder="work, urgent, meeting"
              class="form-input"
            />
          </div>
        </div>
  
        <div class="form-actions">
          <button
            type="button"
            on:click={goBack}
            class="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={loading}
          >
            {#if loading}
              <span class="spinner"></span>
              Creating...
            {:else}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              Create Task
            {/if}
          </button>
        </div>
      </form>
    </div>
  </main>
  
  <style>
    :global(*) {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    * {
      box-sizing: border-box;
    }
  
    .task-page {
      background-image: url('/Bg.svg');
      background-size: cover;
      background-attachment: fixed;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
  
    .task-header {
      background: #f6d7b0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 2.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
  
    .header-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
  
    .back-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(50, 62, 85, 0.1);
      border: none;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      color: #323e55;
      font-weight: 500;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
  
    .back-btn:hover {
      background: rgba(50, 62, 85, 0.15);
      transform: translateX(-2px);
    }
  
    .task-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #323e55;
      margin: 0;
    }
  
    .chronos-logo {
      max-height: 40px;
      object-fit: contain;
    }
  
    .task-container {
      flex: 1;
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
  
    .task-form {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      padding: 2.5rem;
      max-width: 800px;
      width: 100%;
      height: fit-content;
    }
  
    .form-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid #f3f4f6;
    }
  
    .form-icon {
      color: #323e55;
    }
  
    .form-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #323e55;
    }
  
    .alert {
      padding: 1rem 1.25rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
      font-weight: 500;
    }
  
    .alert-error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
  
    .alert-success {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
  
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
  
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  
    .form-group.full-width {
      grid-column: 1 / -1;
    }
  
    label {
      font-size: 0.9rem;
      font-weight: 600;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
  
    .required {
      color: #ef4444;
    }
  
    .label-hint {
      font-weight: 400;
      color: #6b7280;
      font-size: 0.85rem;
    }
  
    .form-input,
    .form-select,
    .form-textarea {
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 0.95rem;
      font-family: inherit;
      transition: all 0.2s ease;
      background: white;
    }
  
    .form-input:focus,
    .form-select:focus,
    .form-textarea:focus {
      outline: none;
      border-color: #323e55;
      box-shadow: 0 0 0 3px rgba(50, 62, 85, 0.1);
    }
  
    .form-input::placeholder,
    .form-textarea::placeholder {
      color: #9ca3af;
    }
  
    .form-textarea {
      resize: vertical;
      min-height: 100px;
    }
  
    .form-select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 1rem center;
      padding-right: 2.5rem;
    }
  
    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding-top: 1.5rem;
      border-top: 2px solid #f3f4f6;
    }
  
    .btn {
      padding: 0.875rem 1.75rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: center;
      min-width: 140px;
    }
  
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  
    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }
  
    .btn-secondary:hover:not(:disabled) {
      background: #e5e7eb;
    }
  
    .btn-primary {
      background: #323e55;
      color: white;
      box-shadow: 0 2px 8px rgba(50, 62, 85, 0.2);
    }
  
    .btn-primary:hover:not(:disabled) {
      background: #2a3546;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(50, 62, 85, 0.3);
    }
  
    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }
  
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
  
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  
    @media (max-width: 768px) {
      .task-header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }
  
      .header-left {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
  
      .task-container {
        padding: 1rem;
      }
  
      .task-form {
        padding: 1.5rem;
      }
  
      .form-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
  
      .form-actions {
        flex-direction: column-reverse;
      }
  
      .btn {
        width: 100%;
      }
    }
  </style>