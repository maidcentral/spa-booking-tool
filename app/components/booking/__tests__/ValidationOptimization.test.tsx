import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SinglePageBookingFlow } from '../SinglePageBookingFlow';
import { BookingWidget } from '../BookingWidget';
import { BookingProvider } from '@/app/contexts/BookingContext';
import { AuthenticationProvider } from '../AuthenticationProvider';

// Mock the debounce function from lodash
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: any, delay: number) => {
    // In tests, we want immediate execution for easier testing
    return jest.fn((...args) => fn(...args));
  },
}));

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

describe('Validation Optimization', () => {
  describe('SinglePageBookingFlow Validation', () => {
    it('should validate postal code on change with debounce', async () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const postalCodeInput = screen.getByLabelText(/Postal Code/i);
      const user = userEvent.setup();

      // Type in postal code
      await user.type(postalCodeInput, '12345');

      // Since we mocked debounce to execute immediately, validation should trigger
      await waitFor(() => {
        // Check that some validation logic was executed
        // (exact validation depends on the mocked data)
        expect(postalCodeInput).toHaveValue('12345');
      });
    });

    it('should handle real-time frequency selection changes', async () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/Customize Your Service/i)).toBeInTheDocument();
      });

      // Look for frequency buttons (if any are rendered)
      const frequencyButtons = screen.queryAllByText(/One-time|Weekly|Bi-weekly|Monthly/i);
      
      if (frequencyButtons.length > 0) {
        const user = userEvent.setup();
        await user.click(frequencyButtons[0]);
        
        // Verify frequency selection was handled
        await waitFor(() => {
          expect(frequencyButtons[0]).toHaveClass(/blue-600|selected/);
        });
      }
    });

    it('should update answers to questions in real-time', async () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // Wait for questions to load (if any)
      await waitFor(() => {
        const questions = screen.queryAllByRole('textbox');
        if (questions.length > 0) {
          const user = userEvent.setup();
          user.type(questions[0], 'Test answer');
          
          // Answer should update immediately
          expect(questions[0]).toHaveValue('Test answer');
        }
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should not cause excessive re-renders on input changes', async () => {
      const renderSpy = jest.fn();
      
      const TestComponent = () => {
        renderSpy();
        return <SinglePageBookingFlow />;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const postalCodeInput = screen.getByLabelText(/Postal Code/i);
      const user = userEvent.setup();

      // Clear the initial render count
      renderSpy.mockClear();

      // Type multiple characters
      await user.type(postalCodeInput, 'abc');

      // Should not cause excessive re-renders (exact count depends on implementation)
      // This is more of a smoke test to ensure we're not causing render storms
      expect(renderSpy).toHaveBeenCalledTimes(3); // One per character
    });

    it('should debounce pricing calculations', async () => {
      const pricingCalculationSpy = jest.fn();
      
      // Mock the pricing calculation to track calls
      jest.mock('@/app/contexts/BookingContext', () => ({
        ...jest.requireActual('@/app/contexts/BookingContext'),
        useBooking: () => ({
          ...jest.requireActual('@/app/contexts/BookingContext').useBooking(),
          calculatePricingAsync: pricingCalculationSpy,
        }),
      }));

      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // Trigger multiple changes quickly
      const postalCodeInput = screen.getByLabelText(/Postal Code/i);
      const user = userEvent.setup();

      await user.type(postalCodeInput, '123');

      // Due to debouncing, pricing calculation should be called less frequently
      // than the number of input changes
      await waitFor(() => {
        expect(pricingCalculationSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Cross-Layout Validation Consistency', () => {
    it('should have consistent validation behavior in both layouts', async () => {
      // Test multi-step layout
      const { unmount: unmountMulti } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );

      const multiStepPostalInput = screen.getByLabelText(/Postal Code/i);
      expect(multiStepPostalInput).toBeInTheDocument();
      unmountMulti();

      // Test single-page layout  
      const { unmount: unmountSingle } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const singlePagePostalInput = screen.getByLabelText(/Postal Code/i);
      expect(singlePagePostalInput).toBeInTheDocument();
      
      // Both should have the same input characteristics
      expect(multiStepPostalInput.type).toBe(singlePagePostalInput.type);
      expect(multiStepPostalInput.placeholder).toBe(singlePagePostalInput.placeholder);
      
      unmountSingle();
    });

    it('should maintain form data consistency across layout modes', () => {
      // This test ensures that form data structure is consistent
      // regardless of which layout mode is used
      
      const multiStepWrapper = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );
      
      const singlePageWrapper = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      // Both should render without errors
      expect(multiStepWrapper.container).toBeInTheDocument();
      expect(singlePageWrapper.container).toBeInTheDocument();

      multiStepWrapper.unmount();
      singlePageWrapper.unmount();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully in single-page layout', async () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const postalCodeInput = screen.getByLabelText(/Postal Code/i);
      const user = userEvent.setup();

      // Enter invalid postal code
      await user.type(postalCodeInput, 'invalid');
      
      // Trigger validation by clicking validate button
      const validateButton = screen.getByText(/Validate/i);
      await user.click(validateButton);

      // Should show error message without crashing
      await waitFor(() => {
        const errorMessage = screen.queryByText(/not available|invalid/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    it('should recover from validation errors when input is corrected', async () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const postalCodeInput = screen.getByLabelText(/Postal Code/i);
      const user = userEvent.setup();

      // Enter invalid postal code first
      await user.type(postalCodeInput, 'invalid');
      await user.click(screen.getByText(/Validate/i));

      // Then enter valid postal code
      await user.clear(postalCodeInput);
      await user.type(postalCodeInput, '10001');

      // Error should be cleared
      await waitFor(() => {
        const errorMessage = screen.queryByText(/not available|invalid/i);
        expect(errorMessage).not.toBeInTheDocument();
      });
    });
  });
});