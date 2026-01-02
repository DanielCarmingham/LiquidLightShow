import { App } from './App';

// Check for WebGL2 support
function checkWebGL2Support(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return gl !== null;
  } catch {
    return false;
  }
}

// Show error message
function showError(message: string): void {
  const container = document.getElementById('app')!;
  container.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
      padding: 2rem;
    ">
      <div>
        <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">Unable to Start</h1>
        <p style="color: #888;">${message}</p>
      </div>
    </div>
  `;
}

// Initialize app
function init(): void {
  // Check WebGL2 support
  if (!checkWebGL2Support()) {
    showError(
      'Your browser does not support WebGL2, which is required for this application. ' +
        'Please try a modern browser like Chrome, Firefox, or Edge.'
    );
    return;
  }

  // Get container
  const container = document.getElementById('app');
  if (!container) {
    console.error('App container not found');
    return;
  }

  try {
    // Create and start the app
    const app = new App(container);
    app.start();

    // Expose for debugging
    (window as unknown as { app: App }).app = app;

    console.log('Liquid Light Show initialized');
    console.log('Press H for help');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showError('Failed to initialize the application. Please check the console for details.');
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
