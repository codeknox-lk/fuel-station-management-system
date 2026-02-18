import { z } from 'zod';

// Shared Enums (matching Prisma)
export const RoleEnum = z.enum(['OWNER', 'MANAGER', 'OFFICE_STAFF', 'HEAD_PUMPER']);
export const PumperStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']);
export const ShiftTypeEnum = z.enum(['MORNING', 'DAY', 'NIGHT', 'ANY']);
export const NotificationTypeEnum = z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']);
export const NotificationPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const NotificationCategoryEnum = z.enum(['SYSTEM', 'OPERATIONS', 'FINANCIAL', 'MAINTENANCE', 'TANK', 'SHIFT', 'CREDIT', 'POS']);

// --- User Schemas ---

export const CreateUserSchema = z.object({
    name: z.string().optional(),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: RoleEnum.default('MANAGER'),
    stationId: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true }).extend({
    password: z.string().min(6).optional() // Password optional on update
});

// --- Pumper Schemas ---

export const CreatePumperSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    phone: z.string().optional().nullable(),
    phoneNumber: z.string().optional().nullable(), // Legacy field support
    employeeId: z.string().optional().nullable(), // Often auto-generated
    stationId: z.string().optional().nullable(),
    status: PumperStatusEnum.optional().default('ACTIVE'), // Flexible default
    shift: z.string().optional().default('ANY'), // Using string to allow flexibility, or restrictive enum if known
    hireDate: z.union([z.string(), z.date()]).optional().nullable().transform(val => val ? new Date(val) : null),
    experience: z.union([z.string(), z.number()]).optional().nullable().transform(val => val ? Number(val) : null),
    rating: z.union([z.string(), z.number()]).optional().nullable().transform(val => val ? Number(val) : null),
    specializations: z.array(z.string()).optional().default([]),
    baseSalary: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    holidayAllowance: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 4500),
    advanceLimit: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 50000),
    isActive: z.boolean().optional().default(true),
});

export const UpdatePumperSchema = CreatePumperSchema.partial();

// --- Safe Transaction Schemas ---

export const SafeTransactionTypeEnum = z.enum([
    'OPENING_BALANCE',
    'CASH_FUEL_SALES',
    'POS_CARD_PAYMENT',
    'CREDIT_PAYMENT',
    'CHEQUE_RECEIVED',
    'LOAN_REPAID',
    'EXPENSE',
    'BANK_DEPOSIT',
    'CASH_HANDOVER',
    'ADJUSTMENT',
    'OTHER_INCOME'
]);

export const CreateSafeTransactionSchema = z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    type: SafeTransactionTypeEnum, // Strict Enum
    amount: z.union([z.string(), z.number()]).transform(val => Number(val)),
    description: z.string().min(1, 'Description is required'),
    shiftId: z.string().optional().nullable(),
    batchId: z.string().optional().nullable(),
    creditSaleId: z.string().optional().nullable(),
    chequeId: z.string().optional().nullable(),
    expenseId: z.string().optional().nullable(),
    loanId: z.string().optional().nullable(),
    depositId: z.string().optional().nullable(),
    performedBy: z.string().optional(),
    timestamp: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : new Date()),
});

// --- Notification Schemas ---

export const CreateNotificationSchema = z.object({
    stationId: z.string().optional().nullable(),
    title: z.string().min(1, 'Title is required'),
    message: z.string().min(1, 'Message is required'),
    type: NotificationTypeEnum,
    priority: NotificationPriorityEnum.optional().default('MEDIUM'),
    category: NotificationCategoryEnum,
    actionUrl: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// --- Office Staff Schemas ---

export const CreateOfficeStaffSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    employeeId: z.string().optional(),
    stationId: z.string().min(1, 'Station ID is required'),
    role: z.string().optional().default('OFFICE_STAFF'),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable().or(z.literal('')),
    baseSalary: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    specialAllowance: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    otherAllowances: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    medicalAllowance: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    holidayAllowance: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    fuelAllowance: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    hireDate: z.union([z.string(), z.date()]).optional().nullable().transform(val => val ? new Date(val) : null),
    isActive: z.boolean().optional().default(true),
});

// --- Shift Schemas ---

export const CreateShiftSchema = z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    templateId: z.string().optional().nullable(),
    type: ShiftTypeEnum.optional().default('MORNING'),
    startTime: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : new Date()),
    openedBy: z.string().optional(),
    assignments: z.array(z.object({
        pumperId: z.string().min(1),
        pumperName: z.string().min(1),
        nozzleId: z.string().min(1),
        startMeterReading: z.number().min(0)
    })).optional().default([])
});

export const UpdateShiftSchema = z.object({
    startTime: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : undefined),
    templateId: z.string().optional().nullable(),
    openedBy: z.string().optional(),
});

export const EndShiftSchema = z.object({
    endTime: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : new Date()),
    closedBy: z.string().optional(),
    cashAmount: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    cardAmount: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    creditAmount: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    chequeAmount: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    shopRevenue: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    pumperBreakdown: z.array(z.any()).optional().default([])
});

export const BulkCloseShiftSchema = z.object({
    stationId: z.string().optional(),
    closedBy: z.string().optional()
});

// --- Delivery Schemas (Fuel Loads) ---

export const CreateDeliverySchema = z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    tankId: z.string().min(1, 'Tank ID is required'),
    fuelType: z.string().optional(),
    invoiceQuantity: z.union([z.string(), z.number()]).transform(val => Number(val)),
    invoiceNumber: z.string().optional().nullable(),
    supplier: z.string().optional().nullable(),
    deliveryTime: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : new Date()),
    receivedBy: z.string().optional(),
    notes: z.string().optional().nullable()
});

export const VerifyDeliverySchema = z.object({
    // Stage 3: Verification
    afterDipReading: z.union([z.string(), z.number()]).transform(val => Number(val)),
    waterLevelAfter: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    afterDipTime: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : new Date()),
    afterMeterReadings: z.record(z.string(), z.number()).optional(), // Map<NozzleId, Reading>

    // Legacy support (optional)
    additionalFuelSold: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),

    // Stage 4: Financials
    costPrice: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    totalCost: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    paymentStatus: z.enum(['PAID', 'UNPAID', 'PARTIAL']).optional().default('UNPAID'),

    // Payment Method Details
    paymentType: z.enum(['CASH', 'CHEQUE', 'CREDIT']).optional(),

    // Cash Specific
    expenseCategory: z.string().optional(), // For the Expense record

    // Cheque Specific
    chequeNumber: z.string().optional(),
    bankId: z.string().optional(),
    chequeDate: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : new Date()),

    verifiedBy: z.string().min(1, 'Verified by is required'),
    notes: z.string().optional()
});

// --- Tank Schemas ---

export const CreateTankSchema = z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    fuelId: z.string().min(1, 'Fuel ID is required'),
    capacity: z.union([z.string(), z.number()]).transform(val => Number(val)),
    currentLevel: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    tankNumber: z.string().optional()
});

export const UpdateTankSchema = z.object({
    capacity: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined),
    currentLevel: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined),
    tankNumber: z.string().optional(),
    isActive: z.boolean().optional()
});

export const CreateTankDipSchema = z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    tankId: z.string().min(1, 'Tank number is required'),
    reading: z.union([z.string(), z.number()]).transform(val => Number(val)),
    recordedBy: z.string().min(1, 'Recorded by is required'),
    dipDate: z.union([z.string(), z.date()]).transform(val => new Date(val)),
    notes: z.string().optional().nullable()
});

// --- Bank Schemas (Deposits) ---

export const CreateBankSchema = z.object({
    name: z.string().min(1, 'Bank name is required'),
    code: z.string().optional().nullable().transform(val => val || null),
    branch: z.string().optional().nullable().transform(val => val || null),
    accountNumber: z.string().optional().nullable().transform(val => val || null),
    accountName: z.string().optional().nullable().transform(val => val || null),
    swiftCode: z.string().optional().nullable().transform(val => val || null),
    contactPerson: z.string().optional().nullable().transform(val => val || null),
    phone: z.string().optional().nullable().transform(val => val || null),
    email: z.string().email().optional().nullable().or(z.literal('')).transform(val => val || null),
    status: z.enum(['active', 'inactive']).optional().default('active')
});

export const UpdateBankSchema = CreateBankSchema.partial();


export const CreateBankTransactionSchema = z.object({
    bankId: z.string().min(1, 'Bank account ID is required'),
    stationId: z.string().optional().nullable(),
    type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'EXPENSE', 'INTEREST', 'ADJUSTMENT']),
    amount: z.union([z.string(), z.number()]).transform(val => Number(val)),
    description: z.string().min(1, 'Description is required'),
    referenceNumber: z.string().optional().nullable(),
    transactionDate: z.union([z.string(), z.date()]).transform(val => new Date(val)),
    createdBy: z.string().min(1, 'Created by is required'),
    notes: z.string().optional().nullable()
});

// --- Credit Sales Schemas ---

export const CreateCreditSaleSchema = z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    shiftId: z.string().min(1, 'Shift ID is required'),
    nozzleId: z.string().min(1, 'Nozzle ID is required'),
    amount: z.union([z.string(), z.number()]).transform(val => Number(val)),
    liters: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    price: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    slipPhoto: z.string().optional().nullable(),
    signedBy: z.string().min(1, 'Signed by is required'),
    timestamp: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : new Date())
});

export const CreateCreditPaymentSchema = z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    amount: z.union([z.string(), z.number()]).transform(val => Number(val)),
    paymentType: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER']),
    referenceNumber: z.string().optional().nullable(),
    chequeNumber: z.string().optional().nullable(),
    chequeDate: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : new Date()),
    bankId: z.string().optional().nullable(),
    paymentDate: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : new Date()),
    receivedBy: z.string().optional(),
    stationId: z.string().optional() // For Safe Transaction
});

export const CreateExpenseSchema = z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    category: z.string().min(1, 'Category is required'),
    description: z.string().min(1, 'Description is required'),
    amount: z.union([z.string(), z.number()]).transform(val => Number(val)),
    fromSafe: z.boolean().optional().default(false),
    paidBy: z.string().min(1, 'Paid by is required'),
    proof: z.string().optional().nullable(),
    expenseDate: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : new Date())
});

export const CreateOilSaleSchema = z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    productName: z.string().min(1, 'Product name is required'),
    quantity: z.union([z.string(), z.number()]).transform(val => Number(val)),
    unit: z.string().optional().default('liters'),
    price: z.union([z.string(), z.number()]).transform(val => Number(val)),
    totalAmount: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : 0),
    customerName: z.string().optional().nullable(),
    saleDate: z.union([z.string(), z.date()]).optional().transform(val => val ? new Date(val) : new Date())
});
