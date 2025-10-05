// Quick script to close active shifts
// Run this in the browser console or as a Node.js script

async function closeActiveShifts() {
  console.log('🔍 Finding active shifts...')
  
  try {
    // Get all active shifts
    const response = await fetch('/api/shifts?active=true')
    const data = await response.json()
    
    const shifts = Array.isArray(data) ? data : data.shifts || []
    const activeShifts = shifts.filter(shift => shift.status === 'OPEN')
    
    console.log(`📊 Found ${activeShifts.length} active shifts:`)
    activeShifts.forEach(shift => {
      console.log(`- Shift ${shift.id} at Station ${shift.stationId} (${shift.openedBy})`)
    })
    
    if (activeShifts.length === 0) {
      console.log('✅ No active shifts to close!')
      return
    }
    
    // Close each active shift
    for (const shift of activeShifts) {
      console.log(`\n🔄 Closing shift ${shift.id}...`)
      
      try {
        // First, get assignments for this shift
        const assignmentsRes = await fetch(`/api/shifts/${shift.id}/assignments`)
        const assignments = await assignmentsRes.json()
        
        console.log(`📋 Found ${assignments.length} assignments`)
        
        // Close all assignments first
        for (const assignment of assignments) {
          if (assignment.status === 'ACTIVE') {
            console.log(`  📝 Closing assignment ${assignment.id}...`)
            
            const closeAssignmentRes = await fetch(`/api/shifts/${shift.id}/assignments/${assignment.id}/close`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                endMeterReading: (assignment.startMeterReading || 1000) + Math.floor(Math.random() * 100), // Random end reading
                endTime: new Date().toISOString()
              })
            })
            
            if (closeAssignmentRes.ok) {
              console.log(`  ✅ Assignment ${assignment.id} closed`)
            } else {
              console.log(`  ❌ Failed to close assignment ${assignment.id}`)
            }
          }
        }
        
        // Now close the shift
        console.log(`🚪 Closing shift ${shift.id}...`)
        const closeShiftRes = await fetch(`/api/shifts/${shift.id}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endTime: new Date().toISOString(),
            closedBy: 'System Admin'
          })
        })
        
        if (closeShiftRes.ok) {
          const result = await closeShiftRes.json()
          console.log(`✅ Shift ${shift.id} closed successfully!`)
          console.log(`📊 Statistics:`, result.statistics)
        } else {
          const error = await closeShiftRes.json()
          console.log(`❌ Failed to close shift ${shift.id}:`, error.error)
        }
        
      } catch (error) {
        console.log(`❌ Error closing shift ${shift.id}:`, error.message)
      }
    }
    
    console.log('\n🎉 All active shifts processed!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the function
closeActiveShifts()

