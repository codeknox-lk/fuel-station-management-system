import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing data (optional - comment out if you want to keep existing data)
  // await prisma.auditLog.deleteMany()
  // await prisma.testPour.deleteMany()
  // await prisma.meterAudit.deleteMany()
  // await prisma.tankDip.deleteMany()
  // await prisma.delivery.deleteMany()
  // await prisma.oilSale.deleteMany()
  // await prisma.creditPayment.deleteMany()
  // await prisma.creditSale.deleteMany()
  // await prisma.posBatch.deleteMany()
  // await prisma.shiftAssignment.deleteMany()
  // await prisma.shift.deleteMany()
  // await prisma.cheque.deleteMany()
  // await prisma.loanExternal.deleteMany()
  // await prisma.loanPumper.deleteMany()
  // await prisma.deposit.deleteMany()
  // await prisma.expense.deleteMany()

  // 1. Create Stations
  console.log('📦 Creating stations...')
  const station1 = await prisma.station.upsert({
    where: { id: 'station-1' },
    update: {},
    create: {
      id: 'station-1',
      name: 'Main Station - Colombo',
      address: '123 Galle Road, Colombo 03',
      city: 'Colombo',
      isActive: true
    }
  })

  const station2 = await prisma.station.upsert({
    where: { id: 'station-2' },
    update: {},
    create: {
      id: 'station-2',
      name: 'Branch Station - Kandy',
      address: '456 Peradeniya Road, Kandy',
      city: 'Kandy',
      isActive: true
    }
  })

  // 2. Create Users (if not exists)
  console.log('👤 Creating users...')
  const adminHash = await bcrypt.hash('FuelStation2024!Admin', 10)
  const managerHash = await bcrypt.hash('ManagerSecure2024!', 10)
  const accountsHash = await bcrypt.hash('AccountsSafe2024!', 10)

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@fuelstation.com',
      password: adminHash,
      role: 'OWNER',
      stationId: null,
      isActive: true
    }
  })

  await prisma.user.upsert({
    where: { username: 'manager1' },
    update: {},
    create: {
      username: 'manager1',
      email: 'manager1@fuelstation.com',
      password: managerHash,
      role: 'MANAGER',
      stationId: station1.id,
      isActive: true
    }
  })

  await prisma.user.upsert({
    where: { username: 'accounts1' },
    update: {},
    create: {
      username: 'accounts1',
      email: 'accounts1@fuelstation.com',
      password: accountsHash,
      role: 'ACCOUNTS',
      stationId: station1.id,
      isActive: true
    }
  })

  // 3. Create Banks
  console.log('🏦 Creating banks...')
  const bank1 = await prisma.bank.upsert({
    where: { id: 'bank-1' },
    update: {},
    create: {
      id: 'bank-1',
      name: 'People\'s Bank',
      branch: 'Colombo 03',
      accountNumber: '1234567890',
      isActive: true
    }
  })

  const bank2 = await prisma.bank.upsert({
    where: { id: 'bank-2' },
    update: {},
    create: {
      id: 'bank-2',
      name: 'Commercial Bank',
      branch: 'Kandy',
      accountNumber: '0987654321',
      isActive: true
    }
  })

  const bank3 = await prisma.bank.upsert({
    where: { id: 'bank-3' },
    update: {},
    create: {
      id: 'bank-3',
      name: 'Sampath Bank',
      branch: 'Colombo 05',
      accountNumber: '1122334455',
      isActive: true
    }
  })

  const bank4 = await prisma.bank.upsert({
    where: { id: 'bank-4' },
    update: {},
    create: {
      id: 'bank-4',
      name: 'Hatton National Bank (HNB)',
      branch: 'Colombo 03',
      accountNumber: '2233445566',
      isActive: true
    }
  })

  const bank5 = await prisma.bank.upsert({
    where: { id: 'bank-5' },
    update: {},
    create: {
      id: 'bank-5',
      name: 'Seylan Bank',
      branch: 'Colombo 07',
      accountNumber: '3344556677',
      isActive: true
    }
  })

  const bank6 = await prisma.bank.upsert({
    where: { id: 'bank-6' },
    update: {},
    create: {
      id: 'bank-6',
      name: 'DFCC Bank',
      branch: 'Colombo 02',
      accountNumber: '4455667788',
      isActive: true
    }
  })

  const bank7 = await prisma.bank.upsert({
    where: { id: 'bank-7' },
    update: {},
    create: {
      id: 'bank-7',
      name: 'National Development Bank (NDB)',
      branch: 'Colombo 04',
      accountNumber: '5566778899',
      isActive: true
    }
  })

  const bank8 = await prisma.bank.upsert({
    where: { id: 'bank-8' },
    update: {},
    create: {
      id: 'bank-8',
      name: 'Bank of Ceylon (BOC)',
      branch: 'Colombo 07',
      accountNumber: '6677889900',
      isActive: true
    }
  })

  const bank9 = await prisma.bank.upsert({
    where: { id: 'bank-9' },
    update: {},
    create: {
      id: 'bank-9',
      name: 'Union Bank',
      branch: 'Colombo 05',
      accountNumber: '7788990011',
      isActive: true
    }
  })

  const bank10 = await prisma.bank.upsert({
    where: { id: 'bank-10' },
    update: {},
    create: {
      id: 'bank-10',
      name: 'NTB (Nations Trust Bank)',
      branch: 'Colombo 03',
      accountNumber: '8899001122',
      isActive: true
    }
  })

  // 4. Create Tanks
  console.log('⛽ Creating tanks...')
  const tank92 = await prisma.tank.upsert({
    where: {
      stationId_tankNumber: {
        stationId: station1.id,
        tankNumber: 'TANK-1'
      }
    },
    update: {},
    create: {
      stationId: station1.id,
      tankNumber: 'TANK-1',
      fuelType: 'PETROL_92',
      capacity: 50000, // 50,000 liters
      currentLevel: 35000, // 35,000 liters currently
      isActive: true
    }
  })

  const tank95 = await prisma.tank.upsert({
    where: {
      stationId_tankNumber: {
        stationId: station1.id,
        tankNumber: 'TANK-2'
      }
    },
    update: {},
    create: {
      stationId: station1.id,
      tankNumber: 'TANK-2',
      fuelType: 'PETROL_95',
      capacity: 30000,
      currentLevel: 20000,
      isActive: true
    }
  })

  const tankDiesel = await prisma.tank.upsert({
    where: {
      stationId_tankNumber: {
        stationId: station1.id,
        tankNumber: 'TANK-3'
      }
    },
    update: {},
    create: {
      stationId: station1.id,
      tankNumber: 'TANK-3',
      fuelType: 'DIESEL',
      capacity: 60000,
      currentLevel: 40000,
      isActive: true
    }
  })

  // 5. Create Pumps
  console.log('🚰 Creating pumps...')
  const pump1 = await prisma.pump.upsert({
    where: {
      stationId_pumpNumber: {
        stationId: station1.id,
        pumpNumber: 'P-01'
      }
    },
    update: {},
    create: {
      stationId: station1.id,
      pumpNumber: 'P-01',
      isActive: true
    }
  })

  const pump2 = await prisma.pump.upsert({
    where: {
      stationId_pumpNumber: {
        stationId: station1.id,
        pumpNumber: 'P-02'
      }
    },
    update: {},
    create: {
      stationId: station1.id,
      pumpNumber: 'P-02',
      isActive: true
    }
  })

  const pump3 = await prisma.pump.upsert({
    where: {
      stationId_pumpNumber: {
        stationId: station1.id,
        pumpNumber: 'P-03'
      }
    },
    update: {},
    create: {
      stationId: station1.id,
      pumpNumber: 'P-03',
      isActive: true
    }
  })

  // 6. Create Nozzles
  console.log('🔫 Creating nozzles...')
  const nozzle1 = await prisma.nozzle.upsert({
    where: {
      pumpId_nozzleNumber: {
        pumpId: pump1.id,
        nozzleNumber: '01'
      }
    },
    update: { tankId: tank92.id },
    create: {
      pumpId: pump1.id,
      tankId: tank92.id,
      nozzleNumber: '01',
      isActive: true
    }
  })

  const nozzle2 = await prisma.nozzle.upsert({
    where: {
      pumpId_nozzleNumber: {
        pumpId: pump1.id,
        nozzleNumber: '02'
      }
    },
    update: { tankId: tank95.id },
    create: {
      pumpId: pump1.id,
      tankId: tank95.id,
      nozzleNumber: '02',
      isActive: true
    }
  })

  const nozzle3 = await prisma.nozzle.upsert({
    where: {
      pumpId_nozzleNumber: {
        pumpId: pump2.id,
        nozzleNumber: '01'
      }
    },
    update: { tankId: tankDiesel.id },
    create: {
      pumpId: pump2.id,
      tankId: tankDiesel.id,
      nozzleNumber: '01',
      isActive: true
    }
  })

  const nozzle4 = await prisma.nozzle.upsert({
    where: {
      pumpId_nozzleNumber: {
        pumpId: pump3.id,
        nozzleNumber: '01'
      }
    },
    update: { tankId: tank92.id },
    create: {
      pumpId: pump3.id,
      tankId: tank92.id,
      nozzleNumber: '01',
      isActive: true
    }
  })

  // 7. Create Pumpers (ONLY if they don't exist - seed script won't recreate deleted pumpers)
  console.log('👷 Creating pumpers (only if missing)...')
  
  // Skip pumper creation entirely - let users create pumpers through the UI
  // This prevents seed script from recreating pumpers that were deleted
  const pumper1 = await prisma.pumper.findFirst({
    where: { name: 'Kamal Perera' }
  })
  
  const pumper2 = await prisma.pumper.findFirst({
    where: { name: 'Nimal Silva' }
  })
  
  const pumper3 = await prisma.pumper.findFirst({
    where: { name: 'Sunil Fernando' }
  })
  
  // Only create if they don't exist at all (seed script won't recreate)
  // Commented out to prevent auto-creation
  // if (!pumper1) {
  //   pumper1 = await prisma.pumper.create({
  //     data: { name: 'Kamal Perera', phone: '0771234567', isActive: true }
  //   })
  // }
  // if (!pumper2) {
  //   pumper2 = await prisma.pumper.create({
  //     data: { name: 'Nimal Silva', phone: '0772345678', isActive: true }
  //   })
  // }
  // if (!pumper3) {
  //   pumper3 = await prisma.pumper.create({
  //     data: { name: 'Sunil Fernando', phone: '0773456789', isActive: true }
  //   })
  // }

  // 8. Create Shift Templates (using findFirstOrCreate to avoid duplicates)
  console.log('📋 Creating shift templates...')
  const morningShift = await prisma.shiftTemplate.findFirst({
    where: {
      stationId: station1.id,
      name: 'Morning Shift',
      startTime: '06:00',
      endTime: '14:00'
    }
  }) || await prisma.shiftTemplate.create({
    data: {
      stationId: station1.id,
      name: 'Morning Shift',
      startTime: '06:00',
      endTime: '14:00',
      isActive: true
    }
  })

  const eveningShift = await prisma.shiftTemplate.findFirst({
    where: {
      stationId: station1.id,
      name: 'Evening Shift',
      startTime: '14:00',
      endTime: '22:00'
    }
  }) || await prisma.shiftTemplate.create({
    data: {
      stationId: station1.id,
      name: 'Evening Shift',
      startTime: '14:00',
      endTime: '22:00',
      isActive: true
    }
  })

  const nightShift = await prisma.shiftTemplate.findFirst({
    where: {
      stationId: station1.id,
      name: 'Night Shift',
      startTime: '22:00',
      endTime: '06:00'
    }
  }) || await prisma.shiftTemplate.create({
    data: {
      stationId: station1.id,
      name: 'Night Shift',
      startTime: '22:00',
      endTime: '06:00',
      isActive: true
    }
  })

  // 9. Create Prices
  console.log('💰 Creating prices...')
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  await prisma.price.create({
    data: {
      stationId: station1.id,
      fuelType: 'PETROL_92',
      price: 385.00,
      effectiveDate: today,
      isActive: true
    }
  })

  await prisma.price.create({
    data: {
      stationId: station1.id,
      fuelType: 'PETROL_95',
      price: 420.00,
      effectiveDate: today,
      isActive: true
    }
  })

  await prisma.price.create({
    data: {
      stationId: station1.id,
      fuelType: 'DIESEL',
      price: 395.00,
      effectiveDate: today,
      isActive: true
    }
  })

  // Future price (scheduled)
  await prisma.price.create({
    data: {
      stationId: station1.id,
      fuelType: 'PETROL_92',
      price: 390.00,
      effectiveDate: tomorrow,
      isActive: false
    }
  })

  // 10. Create Credit Customers
  console.log('💳 Creating credit customers...')
  const customer1 = await prisma.creditCustomer.create({
    data: {
      name: 'ABC Transport',
      company: 'ABC Transport Pvt Ltd',
      address: '123 Main Street, Colombo',
      phone: '0112345678',
      email: 'abc@transport.com',
      creditLimit: 50000,
      currentBalance: 0,
      isActive: true
    }
  })

  const customer2 = await prisma.creditCustomer.create({
    data: {
      name: 'XYZ Logistics',
      company: 'XYZ Logistics Ltd',
      address: '456 Business Ave, Colombo',
      phone: '0113456789',
      email: 'xyz@logistics.com',
      creditLimit: 75000,
      currentBalance: 25000,
      isActive: true
    }
  })

  // 11. Create POS Terminals
  console.log('💻 Creating POS terminals...')
  const posTerminal1 = await prisma.posTerminal.upsert({
    where: {
      stationId_terminalNumber: {
        stationId: station1.id,
        terminalNumber: '001'
      }
    },
    update: {},
    create: {
      stationId: station1.id,
      terminalNumber: '001',
      name: 'POS Terminal 1',
      isActive: true
    }
  })

  const posTerminal2 = await prisma.posTerminal.upsert({
    where: {
      stationId_terminalNumber: {
        stationId: station1.id,
        terminalNumber: '002'
      }
    },
    update: {},
    create: {
      stationId: station1.id,
      terminalNumber: '002',
      name: 'POS Terminal 2',
      isActive: true
    }
  })

  // 12. Create a Sample Shift
  console.log('🔄 Creating sample shift...')
  let sampleShift = null
  try {
    const shiftStart = new Date()
    shiftStart.setHours(6, 0, 0, 0) // 6:00 AM today

    sampleShift = await prisma.shift.create({
      data: {
        stationId: station1.id,
        templateId: morningShift.id,
        startTime: shiftStart,
        status: 'OPEN',
        openedBy: 'admin'
      }
    })
  } catch (e) {
    console.log('  (Skipping shift creation - may already exist)')
    sampleShift = await prisma.shift.findFirst({
      where: { status: 'OPEN' }
    })
  }

  // 13. Create Shift Assignments (only if pumpers exist)
  console.log('📝 Creating shift assignments...')
  if (pumper1 && nozzle1 && sampleShift) {
    try {
      await prisma.shiftAssignment.create({
        data: {
          shiftId: sampleShift.id,
          nozzleId: nozzle1.id,
          pumperName: pumper1.name,
          startMeterReading: 1000.50,
          status: 'ACTIVE'
        }
      })
    } catch (e) {
      console.log('  (Skipping assignment - already exists or pumpers missing)')
    }
  }

  if (pumper2 && nozzle3 && sampleShift) {
    try {
      await prisma.shiftAssignment.create({
        data: {
          shiftId: sampleShift.id,
          nozzleId: nozzle3.id,
          pumperName: pumper2.name,
          startMeterReading: 2500.75,
          status: 'ACTIVE'
        }
      })
    } catch (e) {
      console.log('  (Skipping assignment - already exists or pumpers missing)')
    }
  }

  // 14. Create Sample Expenses
  console.log('💸 Creating sample expenses...')
  await prisma.expense.create({
    data: {
      stationId: station1.id,
      category: 'ELECTRICITY',
      amount: 15000,
      description: 'Monthly electricity bill',
      expenseDate: new Date(),
      paidBy: 'admin'
    }
  })

  await prisma.expense.create({
    data: {
      stationId: station1.id,
      category: 'MAINTENANCE',
      amount: 5000,
      description: 'Pump maintenance',
      expenseDate: new Date(),
      paidBy: 'manager1'
    }
  })

  await prisma.expense.create({
    data: {
      stationId: station1.id,
      category: 'SALARY',
      amount: 45000,
      description: 'Staff salaries',
      expenseDate: new Date(),
      paidBy: 'admin'
    }
  })

  // 15. Create Sample Deposits
  console.log('💰 Creating sample deposits...')
  await prisma.deposit.create({
    data: {
      stationId: station1.id,
      bankId: bank1.id,
      accountId: bank1.accountNumber || '1234567890',
      amount: 100000,
      depositDate: new Date(),
      depositedBy: 'admin',
      depositSlip: 'DEP-001'
    }
  })

  await prisma.deposit.create({
    data: {
      stationId: station1.id,
      bankId: bank2.id,
      accountId: bank2.accountNumber || '0987654321',
      amount: 50000,
      depositDate: new Date(),
      depositedBy: 'admin',
      depositSlip: 'DEP-002'
    }
  })

  // 16. Create Sample Credit Sales (with balance updates)
  console.log('💳 Creating sample credit sales...')
  // Note: fuelType is derived from tank via nozzle, not stored directly
  await prisma.$transaction(async (tx) => {
    await tx.creditSale.create({
      data: {
        customerId: customer1.id,
        shiftId: sampleShift.id,
        nozzleId: nozzle1.id,
        amount: 5000,
        liters: 12.99,
        price: 385.00,
        signedBy: 'Kamal Perera',
        timestamp: new Date()
      }
    })

    await tx.creditCustomer.update({
      where: { id: customer1.id },
      data: { currentBalance: { increment: 5000 } }
    })
  })

  await prisma.$transaction(async (tx) => {
    await tx.creditSale.create({
      data: {
        customerId: customer2.id,
        shiftId: sampleShift.id,
        nozzleId: nozzle3.id,
        amount: 7500,
        liters: 18.99,
        price: 395.00,
        signedBy: 'Nimal Silva',
        timestamp: new Date()
      }
    })

    await tx.creditCustomer.update({
      where: { id: customer2.id },
      data: { currentBalance: { increment: 7500 } }
    })
  })

  // 17. Create Sample Deliveries
  console.log('🚚 Creating sample deliveries...')
  await prisma.delivery.create({
    data: {
      stationId: station1.id,
      tankId: tank92.id,
      quantity: 10000,
      invoiceNumber: 'INV-001',
      deliveryDate: new Date(),
      supplier: 'CEYPETCO',
      receivedBy: 'admin',
      notes: 'Driver: John Doe, Vehicle: WP-1234'
    }
  })

  await prisma.delivery.create({
    data: {
      stationId: station1.id,
      tankId: tankDiesel.id,
      quantity: 15000,
      invoiceNumber: 'INV-002',
      deliveryDate: new Date(),
      supplier: 'CEYPETCO',
      receivedBy: 'admin',
      notes: 'Driver: Jane Smith, Vehicle: WP-5678'
    }
  })

  // 18. Create Sample Tank Dips
  console.log('📊 Creating sample tank dips...')
  await prisma.tankDip.create({
    data: {
      stationId: station1.id,
      tankId: tank92.id,
      reading: 35000, // in liters
      recordedBy: 'admin',
      dipDate: new Date()
    }
  })

  await prisma.tankDip.create({
    data: {
      stationId: station1.id,
      tankId: tankDiesel.id,
      reading: 40000, // in liters
      recordedBy: 'admin',
      dipDate: new Date()
    }
  })

  // 19. Create Sample Cheques (if not exists)
  console.log('📄 Creating sample cheques...')
  try {
    await prisma.cheque.create({
      data: {
        stationId: station1.id,
        bankId: bank1.id,
        chequeNumber: `CHQ-${Date.now()}`, // Unique number
        amount: 25000,
        receivedFrom: 'ABC Transport',
        receivedDate: new Date(),
        status: 'PENDING',
        notes: 'Payment for credit sales'
      }
    })
  } catch (e) {
    console.log('Cheque already exists, skipping...')
  }

  // 20. Create Sample Pumper Loans
  console.log('💵 Creating sample pumper loans...')
  if (pumper1) {
    try {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30) // 30 days from now
      
      await prisma.loanPumper.create({
        data: {
          stationId: station1.id,
          pumperName: pumper1.name,
          amount: 5000,
          reason: 'Advance salary',
          dueDate: dueDate,
          status: 'ACTIVE'
        }
      })
    } catch (e) {
      console.log('  (Skipping pumper loan - already exists or pumpers missing)')
    }
  }

  console.log('✅ Seed completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`  • Stations: 2`)
  console.log(`  • Users: 3`)
  console.log(`  • Banks: 10`)
  console.log(`  • Tanks: 3`)
  console.log(`  • Pumps: 3`)
  console.log(`  • Nozzles: 4`)
  console.log(`  • Pumpers: 3`)
  console.log(`  • Shift Templates: 3`)
  console.log(`  • Prices: 4`)
  console.log(`  • Credit Customers: 2`)
  console.log(`  • POS Terminals: 2`)
  console.log(`  • Sample Shift: 1`)
  console.log(`  • Shift Assignments: 2`)
  console.log(`  • Expenses: 3`)
  console.log(`  • Deposits: 2`)
  console.log(`  • Credit Sales: 2`)
  console.log(`  • Deliveries: 2`)
  console.log(`  • Tank Dips: 2`)
  console.log(`  • Cheques: 1`)
  console.log(`  • Pumper Loans: 1`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })

