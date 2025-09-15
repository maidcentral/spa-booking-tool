import { getEnvConfig, isMultiStepLayout } from '../env';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getEnvConfig', () => {
    it('should return environment configuration object', () => {
      process.env.NEXT_PUBLIC_MULTI_STEP_LAYOUT = 'true';
      
      const config = getEnvConfig();
      
      expect(config).toHaveProperty('multiStepLayout');
      expect(typeof config.multiStepLayout).toBe('boolean');
    });

    it('should default multiStepLayout to true when not set', () => {
      delete process.env.NEXT_PUBLIC_MULTI_STEP_LAYOUT;
      
      const config = getEnvConfig();
      
      expect(config.multiStepLayout).toBe(true);
    });

    it('should parse "true" string as boolean true', () => {
      process.env.NEXT_PUBLIC_MULTI_STEP_LAYOUT = 'true';
      
      const config = getEnvConfig();
      
      expect(config.multiStepLayout).toBe(true);
    });

    it('should parse "false" string as boolean false', () => {
      process.env.NEXT_PUBLIC_MULTI_STEP_LAYOUT = 'false';
      
      const config = getEnvConfig();
      
      expect(config.multiStepLayout).toBe(false);
    });

    it('should treat any non-"false" value as true', () => {
      const testValues = ['1', 'yes', 'TRUE', 'True', 'anything'];
      
      testValues.forEach(value => {
        process.env.NEXT_PUBLIC_MULTI_STEP_LAYOUT = value;
        const config = getEnvConfig();
        expect(config.multiStepLayout).toBe(true);
      });
    });

    it('should handle empty string as default true', () => {
      process.env.NEXT_PUBLIC_MULTI_STEP_LAYOUT = '';
      
      const config = getEnvConfig();
      
      expect(config.multiStepLayout).toBe(true);
    });
  });

  describe('isMultiStepLayout', () => {
    it('should return true when MULTI_STEP_LAYOUT is true', () => {
      process.env.NEXT_PUBLIC_MULTI_STEP_LAYOUT = 'true';
      
      expect(isMultiStepLayout()).toBe(true);
    });

    it('should return false when MULTI_STEP_LAYOUT is false', () => {
      process.env.NEXT_PUBLIC_MULTI_STEP_LAYOUT = 'false';
      
      expect(isMultiStepLayout()).toBe(false);
    });

    it('should return true by default when not set', () => {
      delete process.env.NEXT_PUBLIC_MULTI_STEP_LAYOUT;
      
      expect(isMultiStepLayout()).toBe(true);
    });

    it('should be consistent with getEnvConfig', () => {
      const testValues = ['true', 'false', undefined];
      
      testValues.forEach(value => {
        if (value === undefined) {
          delete process.env.NEXT_PUBLIC_MULTI_STEP_LAYOUT;
        } else {
          process.env.NEXT_PUBLIC_MULTI_STEP_LAYOUT = value;
        }
        
        const config = getEnvConfig();
        expect(isMultiStepLayout()).toBe(config.multiStepLayout);
      });
    });
  });
});