// Complete system reset script
// Run this in the browser console to clear all data

async function resetSystem() {
  console.log('🔄 Resetting system to clean state...')
  
  try {
    // Clear all global data
    if (typeof globalThis !== 'undefined') {
      globalThis.__shifts = []
      globalThis.__shiftAssignments = []
    }
    
    console.log('✅ Global data cleared')
    console.log('🎯 System is now in clean state')
    console.log('📝 You can now test the complete flow:')
    console.log('   1. Go to /shifts/open')
    console.log('   2. Create a new shift')
    console.log('   3. Assign pumpers to nozzles')
    console.log('   4. Go to /shifts/close')
    console.log('   5. Close the shift with proper calculations')
    
    // Test the API to confirm it's clean
    const response = await fetch('/api/shifts?active=true')
    const data = await response.json()
    const shifts = Array.isArray(data) ? data : data.shifts || []
    const activeShifts = shifts.filter(shift => shift.status === 'OPEN')
    
    console.log(`📊 Active shifts: ${activeShifts.length}`)
    console.log(`📊 Total shifts: ${shifts.length}`)
    
    if (activeShifts.length === 0) {
      console.log('✅ System is clean - no active shifts!')
    } else {
      console.log('⚠️  Still have active shifts:', activeShifts.map(s => s.id))
    }
    
  } catch (error) {
    console.error('❌ Error resetting system:', error)
  }
}

// Run the reset
resetSystem()

