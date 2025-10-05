// Simple test to check shifts data
const { getShifts } = require('./src/data/shifts.seed.ts');

try {
  console.log('Testing shifts data...');
  const shifts = getShifts();
  console.log('Shifts loaded successfully:', shifts.length);
  console.log('First shift:', shifts[0]);
} catch (error) {
  console.error('Error loading shifts:', error);
}

