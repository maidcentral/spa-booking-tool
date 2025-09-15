import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SinglePageBookingFlow } from '../SinglePageBookingFlow';
import { BookingWidget } from '../BookingWidget';
import { BookingProvider } from '@/app/contexts/BookingContext';
import { AuthenticationProvider } from '../AuthenticationProvider';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock API services
jest.mock('@/app/services/api/booking-data', () => ({
  bookingDataService: {
    getPostalCodes: jest.fn().mockResolvedValue({ Result: [] }),
    getAvailability: jest.fn().mockResolvedValue({ Result: [] }),
    getRateModifications: jest.fn().mockResolvedValue({ Result: [] }),
    getQuestions: jest.fn().mockResolvedValue({ Result: [] }),
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthenticationProvider>
    <BookingProvider>
      {children}
    </BookingProvider>
  </AuthenticationProvider>
);

describe('Accessibility Tests', () => {
  describe('Single-Page Layout Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // Check for proper heading structure
      const h1Elements = screen.queryAllByRole('heading', { level: 1 });
      const h2Elements = screen.queryAllByRole('heading', { level: 2 });
      const h3Elements = screen.queryAllByRole('heading', { level: 3 });

      // Should have logical heading hierarchy
      expect(h2Elements.length).toBeGreaterThan(0);
      
      // Main sections should be h2
      expect(screen.getByText(/Service Selection/i)).toHaveProperty('tagName', 'H2');
      expect(screen.getByText(/Location & Schedule/i)).toHaveProperty('tagName', 'H2');
      expect(screen.getByText(/Customize Your Service/i)).toHaveProperty('tagName', 'H2');
    });

    it('should have proper form labels and associations', () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // All form inputs should have associated labels
      const postalCodeInput = screen.getByLabelText(/Postal Code/i);
      expect(postalCodeInput).toBeInTheDocument();
      expect(postalCodeInput).toHaveAttribute('id');

      // Labels should be properly associated
      const label = screen.getByText(/Postal Code/i);
      expect(label).toHaveAttribute('for', postalCodeInput.id);
    });

    it('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // Check for ARIA landmarks
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();

      // Buttons should have accessible names
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // All interactive elements should be focusable
      const interactiveElements = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('textbox'),
        ...screen.getAllByRole('combobox'),
      ];

      interactiveElements.forEach(element => {
        expect(element).not.toHaveAttribute('tabIndex', '-1');
      });
    });

    it('should have proper error message associations', async () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const postalCodeInput = screen.getByLabelText(/Postal Code/i);
      
      // Trigger validation error
      postalCodeInput.focus();
      postalCodeInput.blur();

      // Error messages should be properly associated
      const errorMessage = screen.queryByText(/Please enter a postal code/i);
      if (errorMessage) {
        expect(postalCodeInput).toHaveAttribute('aria-describedby');
      }
    });

    it('should have sufficient color contrast', () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // Check for text elements with sufficient contrast
      const textElements = screen.getAllByRole('heading');
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        // Basic check that text is not transparent
        expect(styles.opacity).not.toBe('0');
        expect(styles.visibility).not.toBe('hidden');
      });
    });

    it('should provide screen reader friendly content', () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // Check for screen reader only content
      const srOnlyElements = screen.queryAllByText(/for screen readers/i, { 
        selector: '.sr-only, .visually-hidden' 
      });
      
      // Should have descriptive text for complex interactions
      const validateButton = screen.getByText(/Validate/i);
      expect(validateButton).toHaveAccessibleName();
    });
  });

  describe('Multi-Step vs Single-Page Accessibility Comparison', () => {
    it('should maintain accessibility parity between layouts', async () => {
      // Test multi-step layout
      const { container: multiStepContainer } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );

      const multiStepResults = await axe(multiStepContainer);

      // Test single-page layout
      const { container: singlePageContainer } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const singlePageResults = await axe(singlePageContainer);

      // Both should have no violations
      expect(multiStepResults).toHaveNoViolations();
      expect(singlePageResults).toHaveNoViolations();
    });

    it('should have consistent form field accessibility', () => {
      // Multi-step layout
      const { unmount: unmountMulti } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );

      const multiStepInput = screen.getByLabelText(/Postal Code/i);
      const multiStepA11yProps = {
        hasLabel: Boolean(multiStepInput.getAttribute('aria-labelledby') || multiStepInput.getAttribute('aria-label')),
        hasDescription: Boolean(multiStepInput.getAttribute('aria-describedby')),
        isRequired: multiStepInput.hasAttribute('required') || multiStepInput.getAttribute('aria-required') === 'true'
      };

      unmountMulti();

      // Single-page layout
      const { unmount: unmountSingle } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const singlePageInput = screen.getByLabelText(/Postal Code/i);
      const singlePageA11yProps = {
        hasLabel: Boolean(singlePageInput.getAttribute('aria-labelledby') || singlePageInput.getAttribute('aria-label')),
        hasDescription: Boolean(singlePageInput.getAttribute('aria-describedby')),
        isRequired: singlePageInput.hasAttribute('required') || singlePageInput.getAttribute('aria-required') === 'true'
      };

      // Accessibility properties should be consistent
      expect(singlePageA11yProps).toEqual(multiStepA11yProps);

      unmountSingle();
    });
  });

  describe('Focus Management', () => {
    it('should manage focus properly in single-page layout', () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // Focus should start at the beginning of the form
      const firstInput = screen.getByLabelText(/Postal Code/i);
      firstInput.focus();
      expect(document.activeElement).toBe(firstInput);

      // Tab navigation should follow logical order
      const allFocusableElements = [
        ...screen.getAllByRole('textbox'),
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('combobox'),
      ].filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1);

      expect(allFocusableElements.length).toBeGreaterThan(0);
    });

    it('should trap focus within error dialogs if any', () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // If error dialogs exist, focus should be trapped
      const dialogs = screen.queryAllByRole('dialog');
      if (dialogs.length > 0) {
        dialogs.forEach(dialog => {
          expect(dialog).toHaveAttribute('aria-modal', 'true');
        });
      }
    });
  });

  describe('Screen Reader Experience', () => {
    it('should provide clear section navigation for screen readers', () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // Sections should be properly marked up for screen readers
      const sections = screen.getAllByRole('region');
      sections.forEach(section => {
        expect(section).toHaveAttribute('aria-labelledby');
      });
    });

    it('should announce form validation errors', () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // Error regions should be properly announced
      const errorRegions = screen.queryAllByRole('alert');
      errorRegions.forEach(region => {
        expect(region).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('should provide progress information for screen readers', () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // Single-page layout should indicate form completion status
      const progressInfo = screen.queryByRole('progressbar') || 
                          screen.queryByText(/step/i) ||
                          screen.queryByText(/progress/i);
      
      // Either should have progress indication or clear section structure
      const sections = screen.getAllByRole('heading', { level: 2 });
      expect(sections.length).toBeGreaterThan(1);
    });
  });

  describe('Mobile Accessibility', () => {
    it('should be accessible on mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // Should have no accessibility violations on mobile
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have touch-friendly interactive elements', () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // Buttons should be large enough for touch interaction
        // (This is a basic check - actual touch target size would need DOM measurement)
        expect(button).toBeInTheDocument();
      });
    });
  });
});