const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoxLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3ODA2NzgxNTYsImV4cCI6MTc4MDc0NTU1Nn0.IxY0_FAZML9OX7BQLpkN8qoSUkGwjKWrN5LYS1-RyEA';

console.log('Testing with default secret: ppsusmartmonitoring2026');
try {
  const decoded = jwt.verify(token, 'ppsusmartmonitoring2026');
  console.log('OK:', decoded);
} catch (e) {
  console.log('FAIL:', e.message);
}

console.log('JWT_SECRET env:', process.env.JWT_SECRET || '(not set)');
