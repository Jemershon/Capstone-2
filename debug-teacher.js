// A simple script to check for syntax errors
const fs = require('fs');
const path = require('path');

try {
  const filePath = path.join(__dirname, 'frontend', 'react-app', 'src', 'GCR', 'TeacherD.jsx');
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('TeacherD.jsx read successfully');
  
  // Check for missing parentheses, braces, etc.
  let braceCount = 0;
  let parenCount = 0;
  
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') braceCount--;
    if (content[i] === '(') parenCount++;
    if (content[i] === ')') parenCount--;
  }
  
  console.log(`TeacherD.jsx - Brace balance: ${braceCount}, Parenthesis balance: ${parenCount}`);
  
  if (braceCount !== 0 || parenCount !== 0) {
    console.log('Warning: Possible syntax error in TeacherD.jsx - unbalanced braces or parentheses');
  } else {
    console.log('No obvious syntax issues detected in TeacherD.jsx');
  }
  
} catch (err) {
  console.error('Error:', err);
}