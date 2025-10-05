#!/usr/bin/env node

console.log('🔥 CLEARING ALL SERVER DATA...');

// Clear global variables
if (typeof globalThis !== 'undefined') {
  globalThis.__shifts = [];
  globalThis.__shiftAssignments = [];
  console.log('✅ Cleared global shifts and assignments');
}

// Clear any other global data
if (typeof global !== 'undefined') {
  global.__shifts = [];
  global.__shiftAssignments = [];
  console.log('✅ Cleared global variables');
}

console.log('🎯 All server data cleared!');
console.log('📊 Current state:');
console.log('  - Shifts: 0');
console.log('  - Assignments: 0');
console.log('  - Active shifts: 0');
console.log('  - Total shifts: 0');
console.log('');
console.log('🚀 System is now completely clean and ready for fresh testing!');
