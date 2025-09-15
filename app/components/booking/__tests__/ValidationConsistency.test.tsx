import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingWidget } from '../BookingWidget';
import { SinglePageBookingFlow } from '../SinglePageBookingFlow';
import { BookingProvider } from '@/app/contexts/BookingContext';
import { AuthenticationProvider } from '../AuthenticationProvider';

// Mock API services
jest.mock('@/app/services/api/booking-data', () => ({
  bookingDataService: {
    getPostalCodes: jest.fn().mockResolvedValue({ 
      Result: [
        { PostalCode: '10001', ZoneName: 'New York Zone' },
        { PostalCode: '90210', ZoneName: 'Beverly Hills Zone' }
      ] 
    }),
    getAvailability: jest.fn().mockResolvedValue({ 
      Result: ['2025-12-01T10:00:00Z', '2025-12-02T10:00:00Z'] 
    }),
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

describe('Validation Consistency Between Layouts', () => {
  describe('Postal Code Validation', () => {
    it('should have identical validation behavior in both layouts', async () => {
      // Test Multi-Step Layout
      const { unmount: unmountMulti } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );

      const multiStepInput = screen.getByLabelText(/Postal Code/i);
      const user = userEvent.setup();
      
      // Test valid postal code
      await user.type(multiStepInput, '10001');
      const multiValidateBtn = screen.getByText(/Validate/i);
      await user.click(multiValidateBtn);

      // Should show success message
      expect(await screen.findByText(/Service available/i)).toBeInTheDocument();
      
      unmountMulti();

      // Test Single-Page Layout
      const { unmount: unmountSingle } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const singlePageInput = screen.getByLabelText(/Postal Code/i);
      
      // Test same postal code
      await user.type(singlePageInput, '10001');
      const singleValidateBtn = screen.getByText(/Validate/i);
      await user.click(singleValidateBtn);

      // Should show same success message
      expect(await screen.findByText(/Service available/i)).toBeInTheDocument();
      
      unmountSingle();
    });

    it('should show identical error messages for invalid postal codes', async () => {
      // Test Multi-Step Layout
      const { unmount: unmountMulti } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );

      const multiStepInput = screen.getByLabelText(/Postal Code/i);
      const user = userEvent.setup();
      
      // Test invalid postal code
      await user.type(multiStepInput, '00000');
      const multiValidateBtn = screen.getByText(/Validate/i);
      await user.click(multiValidateBtn);

      const multiErrorMsg = await screen.findByText(/Service not available/i);
      expect(multiErrorMsg).toBeInTheDocument();
      
      unmountMulti();

      // Test Single-Page Layout
      const { unmount: unmountSingle } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const singlePageInput = screen.getByLabelText(/Postal Code/i);
      
      // Test same invalid postal code
      await user.type(singlePageInput, '00000');
      const singleValidateBtn = screen.getByText(/Validate/i);
      await user.click(singleValidateBtn);

      const singleErrorMsg = await screen.findByText(/Service not available/i);
      expect(singleErrorMsg).toBeInTheDocument();
      
      unmountSingle();
    });
  });

  describe('Form Field Consistency', () => {
    it('should have identical form field attributes', () => {
      // Multi-Step Layout
      const { unmount: unmountMulti } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );

      const multiStepInput = screen.getByLabelText(/Postal Code/i);
      const multiStepAttrs = {
        type: multiStepInput.getAttribute('type'),
        placeholder: multiStepInput.getAttribute('placeholder'),
        className: multiStepInput.getAttribute('class'),
      };
      
      unmountMulti();

      // Single-Page Layout
      const { unmount: unmountSingle } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const singlePageInput = screen.getByLabelText(/Postal Code/i);
      const singlePageAttrs = {
        type: singlePageInput.getAttribute('type'),
        placeholder: singlePageInput.getAttribute('placeholder'),
        className: singlePageInput.getAttribute('class'),
      };

      // Attributes should be identical
      expect(singlePageAttrs).toEqual(multiStepAttrs);
      
      unmountSingle();
    });

    it('should have identical button styling and behavior', () => {
      // Multi-Step Layout
      const { unmount: unmountMulti } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );

      const multiValidateBtn = screen.getByText(/Validate/i);
      const multiButtonClasses = multiValidateBtn.getAttribute('class');
      
      unmountMulti();

      // Single-Page Layout  
      const { unmount: unmountSingle } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const singleValidateBtn = screen.getByText(/Validate/i);
      const singleButtonClasses = singleValidateBtn.getAttribute('class');

      // Button classes should be identical
      expect(singleButtonClasses).toBe(multiButtonClasses);
      
      unmountSingle();
    });
  });

  describe('UI State Consistency', () => {
    it('should maintain loading states consistently', () => {
      // Both layouts should show loading states identically
      const { unmount: unmountMulti } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );

      // Check for any loading indicators
      const multiLoading = screen.queryByText(/Loading/i) || screen.queryByRole('status');
      
      unmountMulti();

      const { unmount: unmountSingle } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const singleLoading = screen.queryByText(/Loading/i) || screen.queryByRole('status');

      // Loading states should be consistent (both present or both absent)
      expect(Boolean(multiLoading)).toBe(Boolean(singleLoading));
      
      unmountSingle();
    });

    it('should have consistent section headers and descriptions', () => {
      // Multi-Step Layout - navigate to location step
      const { unmount: unmountMulti } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );

      // Find section header (might need to navigate to step)
      const multiHeader = screen.queryByText(/Location & Schedule/i);
      const multiDescription = screen.queryByText(/Enter your service location/i);
      
      unmountMulti();

      // Single-Page Layout
      const { unmount: unmountSingle } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const singleHeader = screen.queryByText(/Location & Schedule/i);
      const singleDescription = screen.queryByText(/Enter your service location/i);

      // Headers should be present in both layouts
      if (multiHeader) {
        expect(singleHeader).toBeInTheDocument();
        expect(singleHeader?.textContent).toBe(multiHeader.textContent);
      }

      if (multiDescription) {
        expect(singleDescription).toBeInTheDocument();
        expect(singleDescription?.textContent).toBe(multiDescription.textContent);
      }
      
      unmountSingle();
    });
  });

  describe('Performance Consistency', () => {
    it('should render both layouts without performance warnings', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Multi-Step Layout
      const { unmount: unmountMulti } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );
      
      unmountMulti();

      // Single-Page Layout
      const { unmount: unmountSingle } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );
      
      unmountSingle();

      // Should not have performance warnings
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Warning')
      );

      consoleSpy.mockRestore();
    });
  });
});