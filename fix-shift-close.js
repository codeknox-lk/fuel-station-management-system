// Fix shift closure by closing assignments first
// Run this in the browser console

async function fixShiftClosure() {
  console.log('🔧 Fixing shift closure for shift ID 2...')
  
  try {
    // Step 1: Close assignment 4 (Kamal Perera)
    console.log('📝 Closing assignment 4 (Kamal Perera)...')
    const assign4Res = await fetch('/api/shifts/2/assignments/4/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endMeterReading: 1500, // As shown in the UI
        endTime: new Date().toISOString()
      })
    })
    
    if (assign4Res.ok) {
      console.log('✅ Assignment 4 closed successfully')
    } else {
      const error = await assign4Res.json()
      console.log('❌ Failed to close assignment 4:', error.error)
    }
    
    // Step 2: Close assignment 5 (Nimal Silva)
    console.log('📝 Closing assignment 5 (Nimal Silva)...')
    const assign5Res = await fetch('/api/shifts/2/assignments/5/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endMeterReading: 2246, // As shown in the UI
        endTime: new Date().toISOString()
      })
    })
    
    if (assign5Res.ok) {
      console.log('✅ Assignment 5 closed successfully')
    } else {
      const error = await assign5Res.json()
      console.log('❌ Failed to close assignment 5:', error.error)
    }
    
    // Step 3: Now close the shift
    console.log('🚪 Closing shift 2...')
    const shiftRes = await fetch('/api/shifts/2/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endTime: new Date().toISOString(),
        closedBy: 'System Admin'
      })
    })
    
    if (shiftRes.ok) {
      const result = await shiftRes.json()
      console.log('✅ Shift 2 closed successfully!')
      console.log('📊 Shift statistics:', result.statistics)
    } else {
      const error = await shiftRes.json()
      console.log('❌ Failed to close shift 2:', error.error)
    }
    
    console.log('🎉 Shift closure process completed!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the fix
fixShiftClosure()

