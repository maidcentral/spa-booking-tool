/**
 * CardConnect iFrame CSS Styling Configuration
 * Simplified to use a single clean theme
 */

/**
 * Minifies CSS by removing unnecessary whitespace
 */
export function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Remove extra whitespace
    .replace(/\s*([{}:;,>+~])\s*/g, '$1') // Remove whitespace around special characters
    .replace(/;}/g, '}') // Remove trailing semicolons before closing braces
    .trim()
}

// Single clean CSS theme for CardConnect
const cardConnectCSS = `
  input, select {
    margin-bottom: 12px;
    padding: 10px;
    font-size: 16px;
    font-weight: normal;
    color: #333;
    background-color: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s ease-in-out;
  }
  input:focus, select:focus {
    border-color: #007bff;
    outline: 0;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
  label {
    font-weight: 500;
    font-size: 14px;
    display: block;
    margin-bottom: 4px;
    color: #495057;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .error {
    color: #dc3545;
    font-size: 14px;
    margin-top: 4px;
  }
`

/**
 * Get the prepared CSS for CardConnect iframe
 */
export function getCardConnectCSS(): string {
  return minifyCSS(cardConnectCSS)
}