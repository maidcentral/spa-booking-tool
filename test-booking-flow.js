const { chromium } = require('playwright');

async function testBookingFlow() {
  console.log('Starting Playwright test to reproduce Rate Modification 153 error...\n');
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false, // Set to false so we can see what's happening
    slowMo: 500 // Add delay between actions
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console logs
  const consoleLogs = [];
  page.on('console', (msg) => {
    const logMessage = `[${msg.type()}] ${msg.text()}`;
    console.log('CONSOLE:', logMessage);
    consoleLogs.push(logMessage);
  });

  // Collect network requests
  const networkLogs = [];
  page.on('request', (request) => {
    if (request.url().includes('api') || request.url().includes('pricing')) {
      const logMessage = `REQUEST: ${request.method()} ${request.url()}`;
      console.log('NETWORK:', logMessage);
      networkLogs.push(logMessage);
    }
  });

  page.on('response', async (response) => {
    if (response.url().includes('api') || response.url().includes('pricing')) {
      const logMessage = `RESPONSE: ${response.status()} ${response.url()}`;
      console.log('NETWORK:', logMessage);
      networkLogs.push(logMessage);
      
      // Log response body for API calls
      try {
        const responseBody = await response.text();
        if (responseBody && responseBody.includes('153')) {
          console.log('RESPONSE BODY (contains 153):', responseBody);
          networkLogs.push(`RESPONSE BODY: ${responseBody}`);
        }
      } catch (error) {
        console.log('Could not read response body:', error.message);
      }
    }
  });

  try {
    console.log('1. Navigating to booking tool...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    console.log('2. Verifying single-page layout...');
    // Wait for the page to load and check for single-page layout indicators
    await page.waitForSelector('body', { timeout: 10000 });
    
    const pageContent = await page.content();
    const hasAllSections = pageContent.includes('Service Type') && 
                          pageContent.includes('Add-on Services') && 
                          pageContent.includes('Questions');
    
    if (hasAllSections) {
      console.log('✓ Single-page layout confirmed - all sections visible');
    } else {
      console.log('⚠ Layout might not be single-page or sections not loaded yet');
    }

    // Add a delay to ensure all JavaScript is loaded
    await page.waitForTimeout(2000);

    console.log('3. Selecting "Routine Clean" service...');
    // Look for service selection options
    const routineCleanSelector = 'input[value="Routine Clean"], button:has-text("Routine Clean"), [data-service="routine-clean"], [data-service="Routine Clean"]';
    
    try {
      await page.waitForSelector(routineCleanSelector, { timeout: 5000 });
      await page.click(routineCleanSelector);
      console.log('✓ Selected Routine Clean');
    } catch (error) {
      console.log('Could not find Routine Clean selector, trying alternative approaches...');
      
      // Try to find by text content
      const routineCleanElement = await page.locator('text=Routine Clean').first();
      if (await routineCleanElement.isVisible()) {
        await routineCleanElement.click();
        console.log('✓ Selected Routine Clean (alternative method)');
      } else {
        console.log('⚠ Could not find Routine Clean option');
        // List available options for debugging
        const buttons = await page.locator('button, input[type="radio"], input[type="checkbox"]').all();
        console.log('Available interactive elements:', buttons.length);
        for (let i = 0; i < Math.min(buttons.length, 10); i++) {
          const text = await buttons[i].textContent();
          const value = await buttons[i].getAttribute('value');
          console.log(`  - Text: "${text}", Value: "${value}"`);
        }
      }
    }

    await page.waitForTimeout(1000);

    console.log('4. Selecting "Single" frequency...');
    const singleFrequencySelector = 'input[value="Single"], button:has-text("Single"), [data-frequency="single"], [data-frequency="Single"]';
    
    try {
      await page.waitForSelector(singleFrequencySelector, { timeout: 5000 });
      await page.click(singleFrequencySelector);
      console.log('✓ Selected Single frequency');
    } catch (error) {
      console.log('Could not find Single frequency selector, trying alternative approaches...');
      
      const singleElement = await page.locator('text=Single').first();
      if (await singleElement.isVisible()) {
        await singleElement.click();
        console.log('✓ Selected Single frequency (alternative method)');
      } else {
        console.log('⚠ Could not find Single frequency option');
      }
    }

    await page.waitForTimeout(1000);

    console.log('5. Looking for Add-on Services section...');
    // Wait for add-ons to load
    await page.waitForTimeout(2000);
    
    // Try to find add-on services
    const addOnSelectors = [
      'input[type="checkbox"]',
      '[data-testid*="addon"]',
      '[data-testid*="modification"]',
      'button[data-addon]',
      'input[name*="addon"]',
      'input[name*="modification"]'
    ];

    let foundAddOns = false;
    for (const selector of addOnSelectors) {
      const addOns = await page.locator(selector).all();
      if (addOns.length > 0) {
        console.log(`Found ${addOns.length} add-on services with selector: ${selector}`);
        
        // Select the first few available add-ons
        for (let i = 0; i < Math.min(addOns.length, 3); i++) {
          try {
            const addOn = addOns[i];
            const isVisible = await addOn.isVisible();
            const isEnabled = await addOn.isEnabled();
            
            if (isVisible && isEnabled) {
              const text = await addOn.textContent();
              const value = await addOn.getAttribute('value') || await addOn.getAttribute('data-addon');
              console.log(`Selecting add-on: "${text}" (value: ${value})`);
              
              await addOn.click();
              await page.waitForTimeout(500);
              
              foundAddOns = true;
            }
          } catch (error) {
            console.log(`Could not select add-on ${i}:`, error.message);
          }
        }
        break;
      }
    }

    if (!foundAddOns) {
      console.log('⚠ Could not find any add-on services to select');
    }

    await page.waitForTimeout(1000);

    console.log('6. Filling required questions...');
    
    // Fill square feet
    const sqftSelectors = ['input[name*="sqft"]', 'input[name*="square"]', 'input[placeholder*="square"]', 'input[type="number"]'];
    for (const selector of sqftSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.isVisible()) {
          await input.fill('1500');
          console.log('✓ Entered square feet: 1500');
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Fill bedrooms
    const bedroomSelectors = ['input[name*="bedroom"]', 'select[name*="bedroom"]', 'input[placeholder*="bedroom"]'];
    for (const selector of bedroomSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());
          if (tagName === 'select') {
            await element.selectOption('5');
          } else {
            await element.fill('5');
          }
          console.log('✓ Entered bedrooms: 5');
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Fill bathrooms
    const bathroomSelectors = ['input[name*="bathroom"]', 'select[name*="bathroom"]', 'input[placeholder*="bathroom"]'];
    for (const selector of bathroomSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());
          if (tagName === 'select') {
            await element.selectOption('2');
          } else {
            await element.fill('2');
          }
          console.log('✓ Entered bathrooms: 2');
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Fill special instructions
    const instructionsSelectors = ['textarea[name*="instruction"]', 'textarea[placeholder*="instruction"]', 'textarea[name*="comment"]', 'textarea'];
    for (const selector of instructionsSelectors) {
      try {
        const textarea = page.locator(selector).first();
        if (await textarea.isVisible()) {
          await textarea.fill('Test');
          console.log('✓ Entered special instructions: Test');
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    await page.waitForTimeout(2000);

    console.log('7. Triggering pricing calculation...');
    // Try to find and click a calculate/update pricing button
    const calculateSelectors = [
      'button:has-text("Calculate")',
      'button:has-text("Update")',
      'button:has-text("Get Price")',
      'button[type="submit"]',
      'button[data-action*="price"]'
    ];

    for (const selector of calculateSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible()) {
          console.log(`Clicking pricing button: ${selector}`);
          await button.click();
          await page.waitForTimeout(2000);
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Wait for any pricing API calls to complete
    await page.waitForTimeout(3000);

    console.log('\n=== TEST COMPLETED ===');
    console.log('\n=== CONSOLE LOGS SUMMARY ===');
    consoleLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log}`);
    });

    console.log('\n=== NETWORK LOGS SUMMARY ===');
    networkLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log}`);
    });

    // Check for Rate Modification 153 in logs
    const has153InLogs = consoleLogs.some(log => log.includes('153')) || 
                        networkLogs.some(log => log.includes('153'));
    
    if (has153InLogs) {
      console.log('\n🚨 FOUND RATE MODIFICATION 153 IN LOGS!');
    } else {
      console.log('\n✓ No Rate Modification 153 found in logs');
    }

    // Take a screenshot for reference
    await page.screenshot({ path: 'booking-flow-final-state.png', fullPage: true });
    console.log('\nScreenshot saved as: booking-flow-final-state.png');

  } catch (error) {
    console.error('Error during test:', error);
    
    // Take error screenshot
    await page.screenshot({ path: 'booking-flow-error.png', fullPage: true });
    console.log('Error screenshot saved as: booking-flow-error.png');
  } finally {
    // Keep browser open for a few seconds to observe final state
    console.log('\nKeeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);
    
    await browser.close();
  }
}

// Run the test
testBookingFlow().catch(console.error);