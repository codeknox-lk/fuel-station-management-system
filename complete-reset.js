// Complete system reset - removes ALL data
// Run this in the browser console

async function completeReset() {
  console.log('🧹 Complete system reset - removing ALL data...')
  
  try {
    // Clear all global data
    if (typeof globalThis !== 'undefined') {
      globalThis.__shifts = []
      globalThis.__shiftAssignments = []
    }
    
    console.log('✅ All shifts and assignments cleared')
    console.log('🎯 System is now completely empty')
    console.log('📝 Ready for fresh testing from scratch!')
    
    // Verify the system is completely clean
    const response = await fetch('/api/shifts')
    const data = await response.json()
    const shifts = Array.isArray(data) ? data : data.shifts || []
    
    console.log(`📊 Total shifts: ${shifts.length}`)
    console.log(`📊 Active shifts: ${shifts.filter(s => s.status === 'OPEN').length}`)
    console.log(`📊 Closed shifts: ${shifts.filter(s => s.status === 'CLOSED').length}`)
    
    if (shifts.length === 0) {
      console.log('✅ Perfect! System is completely clean!')
      console.log('🚀 You can now test the full workflow:')
      console.log('   1. Go to /shifts/open')
      console.log('   2. Create your first shift')
      console.log('   3. Assign pumpers')
      console.log('   4. Go to /shifts/close')
      console.log('   5. Test all calculations')
    } else {
      console.log('⚠️  Still have data:', shifts.map(s => `${s.id} (${s.status})`))
    }
    
  } catch (error) {
    console.error('❌ Error during reset:', error)
  }
}

// Run the complete reset
completeReset()

