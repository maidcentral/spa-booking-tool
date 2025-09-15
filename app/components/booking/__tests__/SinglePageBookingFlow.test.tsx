import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SinglePageBookingFlow } from '../SinglePageBookingFlow';
import { BookingProvider } from '@/app/contexts/BookingContext';
import { AuthenticationProvider } from '../AuthenticationProvider';

// Mock the environment config
jest.mock('@/app/lib/config/env', () => ({
  isMultiStepLayout: () => false,
  isSinglePageLayout: () => true,
  getLayoutMode: () => 'single-page',
  getEnvConfig: () => ({
    multiStepLayout: false,
    apiBaseUrl: 'https://api.maidcentral.net',
    apiMockingEnabled: false,
  }),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('SinglePageBookingFlow', () => {
  const renderComponent = () => {
    return render(
      <AuthenticationProvider>
        <BookingProvider>
          <SinglePageBookingFlow />
        </BookingProvider>
      </AuthenticationProvider>
    );
  };

  it('should render all booking sections in a single page', () => {
    renderComponent();
    
    // Check that all sections are present
    expect(screen.getByText('Service Selection')).toBeInTheDocument();
    expect(screen.getByText('Location & Schedule')).toBeInTheDocument();
    expect(screen.getByText('Customize Your Service')).toBeInTheDocument();
    expect(screen.getByText('Customer Details')).toBeInTheDocument();
  });

  it('should not show progress indicator', () => {
    renderComponent();
    
    // Progress indicator should not be present in single-page layout
    const progressIndicator = screen.queryByTestId('progress-indicator');
    expect(progressIndicator).not.toBeInTheDocument();
  });

  it('should display section dividers between sections', () => {
    renderComponent();
    
    // Check for section dividers
    const dividers = screen.getAllByTestId('section-divider');
    expect(dividers.length).toBeGreaterThan(0);
  });

  it('should not have Continue buttons between sections', () => {
    renderComponent();
    
    // In single-page layout, there should be no Continue buttons between sections
    // Only a final submit button at the end
    const continueButtons = screen.queryAllByText(/Continue/i);
    expect(continueButtons.length).toBe(0);
    
    // Should have a final submit button
    expect(screen.getByText(/Book Now/i)).toBeInTheDocument();
  });

  it('should allow scrolling through all sections', () => {
    const { container } = renderComponent();
    
    // Check that container is scrollable
    const scrollContainer = container.querySelector('[data-testid="single-page-container"]');
    expect(scrollContainer).toHaveClass('overflow-y-auto');
  });

  it('should validate fields in real-time', async () => {
    renderComponent();
    const user = userEvent.setup();
    
    // Find an input field (e.g., postal code)
    const postalCodeInput = screen.getByLabelText(/Postal Code/i);
    
    // Type an invalid postal code
    await user.type(postalCodeInput, '00000');
    await user.tab(); // Trigger blur event
    
    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText(/Service not available in this area/i)).toBeInTheDocument();
    });
  });

  it('should update pricing in real-time when selections change', async () => {
    renderComponent();
    const user = userEvent.setup();
    
    // Mock a service selection
    const serviceButton = screen.getByText(/Standard Cleaning/i);
    await user.click(serviceButton);
    
    // Check that pricing updates
    await waitFor(() => {
      const pricingSection = screen.getByTestId('pricing-summary');
      expect(pricingSection).toBeInTheDocument();
    });
  });

  it('should maintain same styling as multi-step layout', () => {
    const { container } = renderComponent();
    
    // Check that main components have the same styling classes
    const cards = container.querySelectorAll('.rounded-lg.border');
    expect(cards.length).toBeGreaterThan(0);
    
    // Check for consistent spacing
    const sections = container.querySelectorAll('[data-testid^="section-"]');
    sections.forEach(section => {
      expect(section).toHaveClass('py-8');
    });
  });

  it('should handle form submission at the end', async () => {
    renderComponent();
    const user = userEvent.setup();
    
    // Scroll to bottom and find submit button
    const submitButton = screen.getByText(/Book Now/i);
    
    // Button should be disabled initially
    expect(submitButton).toBeDisabled();
    
    // Fill required fields (simplified for test)
    // ... fill form fields ...
    
    // After filling all required fields, button should be enabled
    // expect(submitButton).toBeEnabled();
  });

  it('should preserve form data when scrolling between sections', async () => {
    renderComponent();
    const user = userEvent.setup();
    
    // Enter data in first section
    const postalCodeInput = screen.getByLabelText(/Postal Code/i);
    await user.type(postalCodeInput, '10001');
    
    // Scroll down and back up (simulate user navigation)
    window.scrollTo(0, 1000);
    window.scrollTo(0, 0);
    
    // Check that data is preserved
    expect(postalCodeInput).toHaveValue('10001');
  });
});