// Force clear ALL data - run this in browser console
// This will clear everything including cached data

async function forceClearAll() {
  console.log('🔥 FORCE CLEARING ALL DATA...')
  
  try {
    // Clear all global variables
    if (typeof globalThis !== 'undefined') {
      globalThis.__shifts = []
      globalThis.__shiftAssignments = []
      globalThis.__tanks = []
      globalThis.__pumps = []
      globalThis.__nozzles = []
    }
    
    // Clear localStorage
    localStorage.clear()
    
    // Clear sessionStorage
    sessionStorage.clear()
    
    console.log('✅ All global data cleared')
    console.log('✅ localStorage cleared')
    console.log('✅ sessionStorage cleared')
    
    // Force refresh the page to reload everything
    console.log('🔄 Refreshing page to reload clean data...')
    window.location.reload()
    
  } catch (error) {
    console.error('❌ Error during force clear:', error)
  }
}

// Run the force clear
forceClearAll()

