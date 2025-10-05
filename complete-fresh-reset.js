// Complete fresh reset - removes ALL data
// Run this in the browser console

async function completeFreshReset() {
  console.log('🧹 COMPLETE FRESH RESET - Removing ALL data...')
  
  try {
    // Clear all global data
    if (typeof globalThis !== 'undefined') {
      globalThis.__shifts = []
      globalThis.__shiftAssignments = []
    }
    
    console.log('✅ All shifts and assignments cleared')
    console.log('🎯 System is now COMPLETELY EMPTY')
    
    // Verify the system is completely clean
    const response = await fetch('/api/shifts')
    const data = await response.json()
    const shifts = Array.isArray(data) ? data : data.shifts || []
    
    console.log(`📊 Total shifts: ${shifts.length}`)
    console.log(`📊 Active shifts: ${shifts.filter(s => s.status === 'OPEN').length}`)
    console.log(`📊 Closed shifts: ${shifts.filter(s => s.status === 'CLOSED').length}`)
    
    if (shifts.length === 0) {
      console.log('✅ PERFECT! System is completely clean!')
      console.log('')
      console.log('🚀 READY FOR FRESH TESTING:')
      console.log('   1. Dashboard will show: 0 Active, 0 Today, Rs. 0, 0h Avg')
      console.log('   2. Shifts page will be completely empty')
      console.log('   3. You can now test the full workflow from scratch')
      console.log('')
      console.log('📝 NEXT STEPS:')
      console.log('   1. Go to /shifts/open')
      console.log('   2. Create your first shift')
      console.log('   3. Assign pumpers to nozzles')
      console.log('   4. Go to /shifts/close')
      console.log('   5. Test all calculations with real data')
    } else {
      console.log('⚠️  Still have data:', shifts.map(s => `${s.id} (${s.status})`))
      console.log('🔄 Try refreshing the page and running this script again')
    }
    
  } catch (error) {
    console.error('❌ Error during reset:', error)
  }
}

// Run the complete fresh reset
completeFreshReset()

