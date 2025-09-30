// A simple script to read the file and check for syntax errors
const fs = require('fs');
const path = require('path');

try {
  const filePath = path.join(__dirname, 'frontend', 'react-app', 'src', 'GCR', 'StudentD.jsx');
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('File read successfully');
  
  // Attempt to detect obvious syntax issues
  let braceCount = 0;
  let parenCount = 0;
  
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') braceCount--;
    if (content[i] === '(') parenCount++;
    if (content[i] === ')') parenCount--;
  }
  
  console.log(`Brace balance: ${braceCount}, Parenthesis balance: ${parenCount}`);
  
  if (braceCount !== 0 || parenCount !== 0) {
    console.log('Warning: Possible syntax error - unbalanced braces or parentheses');
  } else {
    console.log('No obvious syntax issues detected');
  }
  
} catch (err) {
  console.error('Error:', err);
}