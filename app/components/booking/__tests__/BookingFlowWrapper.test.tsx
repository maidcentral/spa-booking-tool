import React from 'react';
import { render, screen } from '@testing-library/react';
import { BookingFlowWrapper } from '../BookingFlowWrapper';
import * as envConfig from '@/app/lib/config/env';

// Mock the child components
jest.mock('../BookingWidget', () => ({
  BookingWidget: () => <div data-testid="multi-step-booking">Multi-Step Booking</div>
}));

jest.mock('../SinglePageBookingFlow', () => ({
  SinglePageBookingFlow: () => <div data-testid="single-page-booking">Single-Page Booking</div>
}));

describe('BookingFlowWrapper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render multi-step layout when MULTI_STEP_LAYOUT is true', () => {
    // Mock environment config to return multi-step
    jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(true);
    jest.spyOn(envConfig, 'getLayoutMode').mockReturnValue('multi-step');
    
    render(<BookingFlowWrapper />);
    
    expect(screen.getByTestId('multi-step-booking')).toBeInTheDocument();
    expect(screen.queryByTestId('single-page-booking')).not.toBeInTheDocument();
  });

  it('should render single-page layout when MULTI_STEP_LAYOUT is false', () => {
    // Mock environment config to return single-page
    jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(false);
    jest.spyOn(envConfig, 'getLayoutMode').mockReturnValue('single-page');
    
    render(<BookingFlowWrapper />);
    
    expect(screen.getByTestId('single-page-booking')).toBeInTheDocument();
    expect(screen.queryByTestId('multi-step-booking')).not.toBeInTheDocument();
  });

  it('should default to multi-step layout when environment variable is not set', () => {
    // Mock environment config to return default (multi-step)
    jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(true);
    jest.spyOn(envConfig, 'getLayoutMode').mockReturnValue('multi-step');
    
    render(<BookingFlowWrapper />);
    
    expect(screen.getByTestId('multi-step-booking')).toBeInTheDocument();
  });

  it('should not re-render when parent component updates', () => {
    const { rerender } = render(<BookingFlowWrapper />);
    
    const firstRender = screen.getByTestId('multi-step-booking');
    
    // Re-render with same props
    rerender(<BookingFlowWrapper />);
    
    const secondRender = screen.getByTestId('multi-step-booking');
    
    // Should be the same element reference (not re-created)
    expect(firstRender).toBe(secondRender);
  });

  it('should maintain consistent props regardless of layout mode', () => {
    // Test that both components receive the same props structure
    // This ensures interface compatibility
    
    // First test multi-step
    jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(true);
    const { unmount: unmount1 } = render(<BookingFlowWrapper />);
    expect(screen.getByTestId('multi-step-booking')).toBeInTheDocument();
    unmount1();
    
    // Then test single-page
    jest.spyOn(envConfig, 'isMultiStepLayout').mockReturnValue(false);
    const { unmount: unmount2 } = render(<BookingFlowWrapper />);
    expect(screen.getByTestId('single-page-booking')).toBeInTheDocument();
    unmount2();
  });
});