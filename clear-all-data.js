// Complete data reset script
console.log('🧹 Clearing all data...')

// Clear global variables
if (typeof globalThis !== 'undefined') {
  globalThis.__shifts = []
  globalThis.__shiftAssignments = []
  globalThis.__tenders = []
  globalThis.__auditLog = []
  globalThis.__expenses = []
  globalThis.__loans = []
  globalThis.__deposits = []
  globalThis.__cheques = []
  globalThis.__safeLedger = []
  globalThis.__tankOperations = []
  globalThis.__deliveries = []
  globalThis.__tests = []
  globalThis.__posBatches = []
  globalThis.__missingSlips = []
  globalThis.__creditSales = []
  globalThis.__creditPayments = []
  globalThis.__creditCustomers = []
}

// Clear localStorage
if (typeof localStorage !== 'undefined') {
  localStorage.clear()
}

// Clear sessionStorage
if (typeof sessionStorage !== 'undefined') {
  sessionStorage.clear()
}

console.log('✅ All data cleared!')
console.log('🔄 Please refresh the page to see clean state')

// Force reload
if (typeof window !== 'undefined') {
  window.location.reload()
}

