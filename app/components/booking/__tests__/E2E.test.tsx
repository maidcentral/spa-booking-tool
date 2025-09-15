import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingFlowWrapper } from '../BookingFlowWrapper';
import { BookingWidget } from '../BookingWidget';
import { SinglePageBookingFlow } from '../SinglePageBookingFlow';
import { BookingProvider } from '@/app/contexts/BookingContext';
import { AuthenticationProvider } from '../AuthenticationProvider';
import * as envConfig from '@/app/lib/config/env';

// Mock API services with realistic responses
const mockApiResponses = {
  postalCodes: {
    Result: [
      { PostalCode: '10001', ZoneName: 'Manhattan Zone' },
      { PostalCode: '90210', ZoneName: 'Beverly Hills Zone' },
      { PostalCode: '60601', ZoneName: 'Chicago Zone' }
    ]
  },
  availability: {
    Result: [
      '2025-12-01T10:00:00Z',
      '2025-12-02T14:00:00Z',
      '2025-12-03T09:00:00Z'
    ]
  },
  rateModifications: {
    Result: [
      {
        RateModificationId: 1,
        Name: 'Deep Clean',
        CostDisplay: '+$25',
        IsRequired: false,
        IsPercentage: false
      },
      {
        RateModificationId: 2,
        Name: 'Pet Hair Removal',
        CostDisplay: '+$15',
        IsRequired: false,
        IsPercentage: false
      }
    ]
  },
  questions: {
    Result: [
      {
        QuestionId: 1,
        QuestionText: 'How many bedrooms?',
        QuestionType: 'Whole Number',
        IsRequired: true,
        Answers: []
      },
      {
        QuestionId: 2,
        QuestionText: 'Special instructions',
        QuestionType: 'Rich Text',
        IsRequired: false,
        Answers: []
      }
    ]
  }
};

jest.mock('@/app/services/api/booking-data', () => ({
  bookingDataService: {
    getPostalCodes: jest.fn().mockResolvedValue(mockApiResponses.postalCodes),
    getAvailability: jest.fn().mockResolvedValue(mockApiResponses.availability),
    getRateModifications: jest.fn().mockResolvedValue(mockApiResponses.rateModifications),
    getQuestions: jest.fn().mockResolvedValue(mockApiResponses.questions),
  },
}));

// Mock scroll behavior
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthenticationProvider>
    <BookingProvider>
      {children}
    </BookingProvider>
  </AuthenticationProvider>
);

describe('End-to-End Layout Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BookingFlowWrapper Integration', () => {
    it('should render multi-step layout when environment variable is true', () => {
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(true);
      
      render(
        <TestWrapper>
          <BookingFlowWrapper />
        </TestWrapper>
      );

      // Should show progress indicator (multi-step specific)
      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument();
      
      // Should show Continue button (multi-step specific)
      expect(screen.queryByText(/Continue/i)).toBeInTheDocument();
    });

    it('should render single-page layout when environment variable is false', () => {
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(false);
      
      render(
        <TestWrapper>
          <BookingFlowWrapper />
        </TestWrapper>
      );

      // Should show all sections at once
      expect(screen.getByText(/Service Selection/i)).toBeInTheDocument();
      expect(screen.getByText(/Location & Schedule/i)).toBeInTheDocument();
      expect(screen.getByText(/Customize Your Service/i)).toBeInTheDocument();
      
      // Should show section dividers
      expect(screen.getAllByTestId('section-divider').length).toBeGreaterThan(0);
    });
  });

  describe('Complete Booking Flow - Multi-Step', () => {
    beforeEach(() => {
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(true);
    });

    it('should complete full booking flow in multi-step mode', async () => {
      render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );

      const user = userEvent.setup();

      // Step 1: Service Selection (if service selection step exists)
      const serviceButtons = screen.queryAllByRole('button');
      if (serviceButtons.length > 0) {
        // Find and click first service button
        const serviceButton = serviceButtons.find(btn => 
          btn.textContent?.includes('Clean') || btn.textContent?.includes('Service')
        );
        if (serviceButton) {
          await user.click(serviceButton);
        }
      }

      // Step 2: Location & Schedule
      const postalCodeInput = await screen.findByLabelText(/Postal Code/i);
      await user.type(postalCodeInput, '10001');
      
      const validateButton = screen.getByText(/Validate/i);
      await user.click(validateButton);

      // Wait for validation
      await waitFor(() => {
        expect(screen.getByText(/Service available/i)).toBeInTheDocument();
      });

      // Select date if available
      const dateButtons = screen.queryAllByRole('button');
      const dateButton = dateButtons.find(btn => 
        btn.textContent?.match(/Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov/i)
      );
      if (dateButton) {
        await user.click(dateButton);
      }

      // Continue to next step
      const continueButtons = screen.queryAllByText(/Continue/i);
      if (continueButtons.length > 0) {
        await user.click(continueButtons[0]);
      }

      // Verify we progressed through the flow
      expect(screen.getByText(/Customize Your Service/i)).toBeInTheDocument();
    });
  });

  describe('Complete Booking Flow - Single Page', () => {
    beforeEach(() => {
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(false);
    });

    it('should complete full booking flow in single-page mode', async () => {
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const user = userEvent.setup();

      // All sections should be visible immediately
      expect(screen.getByText(/Service Selection/i)).toBeInTheDocument();
      expect(screen.getByText(/Location & Schedule/i)).toBeInTheDocument();
      expect(screen.getByText(/Customize Your Service/i)).toBeInTheDocument();

      // Fill out location
      const postalCodeInput = screen.getByLabelText(/Postal Code/i);
      await user.type(postalCodeInput, '10001');
      
      const validateButton = screen.getByText(/Validate/i);
      await user.click(validateButton);

      // Wait for validation
      await waitFor(() => {
        expect(screen.getByText(/Service available/i)).toBeInTheDocument();
      });

      // Select date if available
      const dateButtons = screen.queryAllByRole('button');
      const dateButton = dateButtons.find(btn => 
        btn.textContent?.match(/Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov/i)
      );
      if (dateButton) {
        await user.click(dateButton);
      }

      // Fill out required questions if any
      const requiredInputs = screen.queryAllByDisplayValue('');
      for (const input of requiredInputs) {
        const label = input.closest('div')?.querySelector('label');
        if (label?.textContent?.includes('*')) {
          if (input.getAttribute('type') === 'number') {
            await user.type(input, '3');
          } else {
            await user.type(input, 'Test value');
          }
        }
      }

      // Should show final Book Now button
      expect(screen.getByText(/Book Now/i)).toBeInTheDocument();
    });
  });

  describe('Form Data Persistence', () => {
    it('should maintain form data when switching between sections in single-page', async () => {
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(false);
      
      render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );

      const user = userEvent.setup();
      const postalCodeInput = screen.getByLabelText(/Postal Code/i);
      
      // Enter data
      await user.type(postalCodeInput, '10001');
      
      // Simulate scroll/navigation
      window.scrollTo(0, 1000);
      window.scrollTo(0, 0);
      
      // Data should persist
      expect(postalCodeInput).toHaveValue('10001');
    });

    it('should maintain form data when progressing through multi-step flow', async () => {
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(true);
      
      render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );

      const user = userEvent.setup();
      
      // Enter postal code
      const postalCodeInput = await screen.findByLabelText(/Postal Code/i);
      await user.type(postalCodeInput, '10001');
      await user.click(screen.getByText(/Validate/i));
      
      // Wait for validation
      await waitFor(() => {
        expect(screen.getByText(/Service available/i)).toBeInTheDocument();
      });

      // Continue to next step and back
      const continueButton = screen.queryByText(/Continue/i);
      if (continueButton) {
        await user.click(continueButton);
        
        // Navigate back (if possible)
        const backButton = screen.queryByText(/Back/i);
        if (backButton) {
          await user.click(backButton);
          
          // Data should persist
          const postalCodeInputAfter = screen.getByLabelText(/Postal Code/i);
          expect(postalCodeInputAfter).toHaveValue('10001');
        }
      }
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to mobile viewport in both layouts', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      // Test multi-step
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(true);
      const { unmount: unmountMulti } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );
      
      // Should render without errors on mobile
      expect(screen.getByLabelText(/Postal Code/i)).toBeInTheDocument();
      unmountMulti();

      // Test single-page
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(false);
      const { unmount: unmountSingle } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );
      
      // Should render without errors on mobile
      expect(screen.getByLabelText(/Postal Code/i)).toBeInTheDocument();
      unmountSingle();
    });

    it('should adapt to desktop viewport in both layouts', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      // Test multi-step
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(true);
      const { unmount: unmountMulti } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );
      
      expect(screen.getByLabelText(/Postal Code/i)).toBeInTheDocument();
      unmountMulti();

      // Test single-page
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(false);
      const { unmount: unmountSingle } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );
      
      expect(screen.getByLabelText(/Postal Code/i)).toBeInTheDocument();
      unmountSingle();
    });
  });

  describe('API Integration Consistency', () => {
    it('should make identical API calls in both layouts', async () => {
      const { bookingDataService } = require('@/app/services/api/booking-data');
      
      // Test multi-step
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(true);
      const { unmount: unmountMulti } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );
      
      // Should call getPostalCodes
      await waitFor(() => {
        expect(bookingDataService.getPostalCodes).toHaveBeenCalled();
      });
      
      const multiStepCalls = bookingDataService.getPostalCodes.mock.calls.length;
      unmountMulti();

      // Clear mocks
      jest.clearAllMocks();

      // Test single-page
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(false);
      const { unmount: unmountSingle } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );
      
      // Should call getPostalCodes
      await waitFor(() => {
        expect(bookingDataService.getPostalCodes).toHaveBeenCalled();
      });
      
      const singlePageCalls = bookingDataService.getPostalCodes.mock.calls.length;
      unmountSingle();

      // Should make same number of API calls
      expect(singlePageCalls).toBe(multiStepCalls);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully in both layouts', async () => {
      // Mock API failure
      const { bookingDataService } = require('@/app/services/api/booking-data');
      bookingDataService.getPostalCodes.mockRejectedValueOnce(new Error('API Error'));

      // Test multi-step error handling
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(true);
      const { unmount: unmountMulti } = render(
        <TestWrapper>
          <BookingWidget />
        </TestWrapper>
      );
      
      // Should render without crashing
      expect(screen.getByLabelText(/Postal Code/i)).toBeInTheDocument();
      unmountMulti();

      // Reset mock for single-page test
      bookingDataService.getPostalCodes.mockRejectedValueOnce(new Error('API Error'));

      // Test single-page error handling
      jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(false);
      const { unmount: unmountSingle } = render(
        <TestWrapper>
          <SinglePageBookingFlow />
        </TestWrapper>
      );
      
      // Should render without crashing
      expect(screen.getByLabelText(/Postal Code/i)).toBeInTheDocument();
      unmountSingle();
    });
  });
});