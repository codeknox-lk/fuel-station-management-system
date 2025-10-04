const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Station Context Implementation...\n');

// Test 1: Check if StationContext exists
console.log('📝 Test 1: StationContext File Check');
const stationContextPath = path.join(__dirname, 'src/contexts/StationContext.tsx');
if (fs.existsSync(stationContextPath)) {
  console.log('✅ StationContext.tsx exists');
  
  const content = fs.readFileSync(stationContextPath, 'utf8');
  
  // Check for key components
  const hasProvider = content.includes('StationProvider');
  const hasUseStation = content.includes('useStation');
  const hasSelectedStation = content.includes('selectedStation');
  const hasSetSelectedStation = content.includes('setSelectedStation');
  const hasIsAllStations = content.includes('isAllStations');
  
  console.log(`✅ StationProvider: ${hasProvider ? '✓' : '✗'}`);
  console.log(`✅ useStation hook: ${hasUseStation ? '✓' : '✗'}`);
  console.log(`✅ selectedStation state: ${hasSelectedStation ? '✓' : '✗'}`);
  console.log(`✅ setSelectedStation function: ${hasSetSelectedStation ? '✓' : '✗'}`);
  console.log(`✅ isAllStations flag: ${hasIsAllStations ? '✓' : '✗'}`);
} else {
  console.log('❌ StationContext.tsx not found');
}

// Test 2: Check if layout includes StationProvider
console.log('\n📝 Test 2: Layout Integration Check');
const layoutPath = path.join(__dirname, 'src/app/(app)/layout.tsx');
if (fs.existsSync(layoutPath)) {
  console.log('✅ App layout exists');
  
  const content = fs.readFileSync(layoutPath, 'utf8');
  const hasStationProvider = content.includes('StationProvider');
  const hasStationContextImport = content.includes('@/contexts/StationContext');
  
  console.log(`✅ StationProvider import: ${hasStationContextImport ? '✓' : '✗'}`);
  console.log(`✅ StationProvider usage: ${hasStationProvider ? '✓' : '✗'}`);
} else {
  console.log('❌ App layout not found');
}

// Test 3: Check pages that use station context
console.log('\n📝 Test 3: Page Integration Check');
const pagesToCheck = [
  'src/app/(app)/dashboard/page.tsx',
  'src/app/(app)/shifts/page.tsx',
  'src/app/(app)/audit-log/page.tsx',
  'src/app/(app)/tanks/report/page.tsx',
  'src/app/(app)/reports/shift/page.tsx',
  'src/app/(app)/reports/daily/page.tsx'
];

let pagesWithStationContext = 0;
pagesToCheck.forEach(pagePath => {
  const fullPath = path.join(__dirname, pagePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasUseStation = content.includes('useStation');
    const hasStationContextImport = content.includes('@/contexts/StationContext');
    
    if (hasUseStation && hasStationContextImport) {
      console.log(`✅ ${path.basename(pagePath)}: Station context integrated`);
      pagesWithStationContext++;
    } else {
      console.log(`⚠️  ${path.basename(pagePath)}: Station context not fully integrated`);
    }
  } else {
    console.log(`❌ ${path.basename(pagePath)}: File not found`);
  }
});

// Test 4: Check TopBar integration
console.log('\n📝 Test 4: TopBar Integration Check');
const topBarPath = path.join(__dirname, 'src/components/layout/TopBar.tsx');
if (fs.existsSync(topBarPath)) {
  console.log('✅ TopBar component exists');
  
  const content = fs.readFileSync(topBarPath, 'utf8');
  const hasUseStation = content.includes('useStation');
  const hasStationContextImport = content.includes('@/contexts/StationContext');
  const hasSetSelectedStation = content.includes('setSelectedStation');
  
  console.log(`✅ useStation hook: ${hasUseStation ? '✓' : '✗'}`);
  console.log(`✅ Station context import: ${hasStationContextImport ? '✓' : '✗'}`);
  console.log(`✅ setSelectedStation usage: ${hasSetSelectedStation ? '✓' : '✗'}`);
} else {
  console.log('❌ TopBar component not found');
}

// Test 5: Check API routes for station filtering
console.log('\n📝 Test 5: API Routes Station Filtering Check');
const apiRoutesToCheck = [
  'src/app/api/audit-log/route.ts',
  'src/app/api/shifts/route.ts'
];

let apiRoutesWithStationFiltering = 0;
apiRoutesToCheck.forEach(routePath => {
  const fullPath = path.join(__dirname, routePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasStationIdParam = content.includes('stationId');
    const hasStationFiltering = content.includes('stationId=');
    
    if (hasStationIdParam && hasStationFiltering) {
      console.log(`✅ ${path.basename(routePath)}: Station filtering implemented`);
      apiRoutesWithStationFiltering++;
    } else {
      console.log(`⚠️  ${path.basename(routePath)}: Station filtering not implemented`);
    }
  } else {
    console.log(`❌ ${path.basename(routePath)}: File not found`);
  }
});

// Test 6: Check data seed files
console.log('\n📝 Test 6: Data Seed Files Check');
const dataSeedPath = path.join(__dirname, 'src/data');
if (fs.existsSync(dataSeedPath)) {
  const files = fs.readdirSync(dataSeedPath);
  const seedFiles = files.filter(file => file.endsWith('.seed.ts'));
  
  console.log(`✅ Found ${seedFiles.length} seed files`);
  seedFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
} else {
  console.log('❌ Data seed directory not found');
}

// Summary
console.log('\n🎉 Station Context Verification Complete!');
console.log('\n📊 Summary:');
console.log(`✅ Pages with station context: ${pagesWithStationContext}/${pagesToCheck.length}`);
console.log(`✅ API routes with station filtering: ${apiRoutesWithStationFiltering}/${apiRoutesToCheck.length}`);

if (pagesWithStationContext >= pagesToCheck.length * 0.8) {
  console.log('🎉 Station context is well integrated across the application!');
} else {
  console.log('⚠️  Some pages may need station context integration');
}

if (apiRoutesWithStationFiltering >= apiRoutesToCheck.length * 0.8) {
  console.log('🎉 API routes have good station filtering support!');
} else {
  console.log('⚠️  Some API routes may need station filtering');
}

console.log('\n✅ Frontend Test Verification Complete!');
