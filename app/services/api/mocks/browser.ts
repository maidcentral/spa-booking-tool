import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// This configures a Service Worker with the given request handlers.
export const worker = setupWorker(...handlers);

// Start the worker
export async function startMocking() {
  if (typeof window === 'undefined') {
    return;
  }

  // Only start mocking in development or when explicitly enabled
  const shouldMock = process.env.NODE_ENV === 'development' && 
                     process.env.NEXT_PUBLIC_API_MOCKING_ENABLED === 'true';

  if (!shouldMock) {
    return;
  }

  return worker.start({
    serviceWorker: {
      url: '/mockServiceWorker.js'
    },
    onUnhandledRequest: 'bypass',
    quiet: false // Set to true to disable MSW logs
  }).then(() => {
    console.log('[MSW] Mocking enabled');
  });
}

// Stop the worker
export function stopMocking() {
  if (worker) {
    worker.stop();
    console.log('[MSW] Mocking disabled');
  }
}