import { initializeLogger, getPresetConfig } from '@kitiumai/logger';
import { beforeAll } from 'vitest';

// Initialize logger before all tests
beforeAll(() => {
  const config = getPresetConfig('development', {
    loki: {
      enabled: false, // Disable Loki in tests
      host: 'localhost',
      port: 3100,
      protocol: 'http',
      batchSize: 100,
      interval: 5000,
      timeout: 10000,
    },
    enableFileTransport: false, // Disable file logging in tests
  });

  initializeLogger(config);
});
