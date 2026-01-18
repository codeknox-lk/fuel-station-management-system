# 🚗⛽ Fuel Station Management System

A comprehensive, modern fuel station management system built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**. This system provides complete operational management for fuel stations with role-based access control, financial tracking, and professional reporting capabilities.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

## 🌟 Features

### ✅ **Complete Fuel Station Operations**
- **Shift Management**: Open/close shifts with pumper assignments and meter readings
- **Can Sales Tracking**: Separate tracking of pump sales vs can sales with detailed breakdown
- **Oil Product Management**: Book stock tracking for oil products (no dipping required)
- **Tank Management**: Tank dips, deliveries, variance tracking, and automated alerts
- **Meter Audits**: Mid-day meter checks with variance detection
- **Test Pours**: Record and track test pours with return calculations

### 💰 **Financial Management**
- **POS Integration**: Batch management, missing slip tracking, and reconciliation
- **Credit Management**: Customer accounts, credit sales, payments, and aging analysis
- **Safe Management**: Cash flow tracking with inflow/outflow categorization
- **Expense Tracking**: Categorized expense recording with proof attachments
- **Bank Deposits**: Multi-bank deposit tracking with slip references
- **Loan Management**: External and pumper loan tracking

### 📊 **Professional Reporting & Analytics**
- **PDF/Excel Exports**: Professional reports with company branding
- **Daily Reports**: Sales breakdown, expenses, deposits, and profit analysis
- **Shift Reports**: Per-nozzle performance, pumper variance, and reconciliation
- **Tank Reports**: Movement tracking, variance analysis, and fill level monitoring
- **Profit Analysis**: Monthly profit trends with revenue/expense breakdown
- **Owner Dashboard**: Multi-station aggregation with real-time exception alerts

### 🔐 **Role-Based Access Control**
- **OWNER**: Full system access including settings and audit logs
- **MANAGER**: Operational management, shifts, audits, and tank operations
- **ACCOUNTS**: Financial operations, reports, and credit management

### 🔍 **Audit & Compliance**
- **Comprehensive Audit Logging**: All user actions tracked with timestamps
- **Exception Management**: Automated alerts for variances and anomalies
- **Tolerance Configuration**: Customizable variance tolerance settings
- **User Activity Tracking**: Complete audit trail for compliance

## 🏗️ System Architecture

### **Frontend (44 Pages)**
```
📁 Authentication
├── /login - Role selection and authentication

📁 Dashboard & Overview
├── /dashboard - Main dashboard with stats and activities
├── /owner-dashboard - Multi-station aggregated view
└── /notifications - Comprehensive notification center

📁 Operations Management
├── /shifts - Shift overview and management
├── /shifts/open - Open new shifts with assignments
├── /shifts/close - Close shifts with tender reconciliation
├── /audits - Meter audits and mid-day checks
└── /tests - Test pour recording and tracking

📁 Tank & Inventory
├── /tanks - Tank overview and monitoring
├── /tanks/dips - Record tank dip readings
├── /tanks/deliveries - Fuel delivery management
└── /tanks/report - Tank movement and variance reports

📁 POS & Payments
├── /pos - POS system overview
├── /pos/batches - POS batch management
├── /pos/missing-slips - Missing slip reporting
└── /pos/reconcile - POS reconciliation

📁 Credit Management
├── /credit - Credit system overview
├── /credit/customers - Customer account management
├── /credit/sales - Credit sales recording
├── /credit/payments - Payment processing
└── /credit/aging - Aging analysis and reports

📁 Financial Management
├── /safe - Financial overview and safe summary
├── /expenses - Expense recording and tracking
├── /loans - External and pumper loan management
├── /deposits - Bank deposit management
└── /cheques - Cheque tracking and status

📁 Reports & Analytics
├── /reports - Reports overview dashboard
├── /reports/daily - Daily operational reports
├── /reports/shift - Detailed shift analysis
├── /reports/tanks - Tank movement reports
├── /reports/profit - Profit analysis and trends
└── /reports/pumper-variance - Pumper performance analysis

📁 System Administration
├── /settings - System settings overview (OWNER only)
├── /settings/stations - Station management
├── /settings/banks - Bank configuration
├── /settings/shift-templates - Shift template management
├── /settings/prices - Fuel price management
├── /settings/pos-terminals - POS terminal configuration
├── /settings/users - User account management
├── /settings/pumpers - Pumper management
├── /settings/tolerance - Variance tolerance configuration
└── /audit-log - System audit logging (OWNER only)
```

### **Backend API (42 Endpoints)**
```
📁 Core Operations
├── /api/stations - Station CRUD operations
├── /api/shifts - Shift management and assignments
├── /api/tanks - Tank operations and monitoring
├── /api/audits/meter - Meter audit recording
└── /api/tests - Test pour management

📁 Financial APIs
├── /api/expenses - Expense tracking
├── /api/deposits - Bank deposit management
├── /api/loans/* - Loan management (external/pumper)
├── /api/cheques - Cheque tracking
├── /api/credit/* - Credit management system
├── /api/pos/* - POS system integration
└── /api/oil-sales - Oil product sales tracking

📁 Reporting & Analytics
├── /api/reports/daily - Daily report generation
├── /api/reports/monthly - Monthly analytics
└── /api/safe/summary - Safe balance calculations

📁 System Management
├── /api/users - User management
├── /api/pumpers - Pumper management
├── /api/prices - Price management
├── /api/banks - Bank configuration
├── /api/shift-templates - Template management
├── /api/settings/tolerance - System configuration
└── /api/audit-log - Audit logging system
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ 
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/codeknox-lk/fuel-station-management-system.git
cd fuel-station-management-system
```

2. **Install dependencies**
```bash
npm install
```

3. **Run the development server**
```bash
npm run dev
```

4. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Default Login Credentials
After running the seed script, use these credentials:
- **Username:** `admin` / **Password:** `FuelStation2024!Admin` (OWNER role)
- **Username:** `manager1` / **Password:** `ManagerSecure2024!` (MANAGER role)
- **Username:** `accounts1` / **Password:** `AccountsSafe2024!` (ACCOUNTS role)

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **Recharts** - Data visualization and charts
- **React Hook Form** - Form management
- **Zod** - Schema validation

### **Export & Reporting**
- **jsPDF** - PDF generation
- **jsPDF-AutoTable** - PDF table generation
- **XLSX** - Excel file generation

### **Development Tools**
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 📱 Key Functionalities

### **Shift Management**
- Open shifts with pumper assignments to specific nozzles
- Real-time meter reading tracking
- Can sales vs pump sales separation
- Tender reconciliation with variance analysis
- Automatic tolerance checking and alerts

### **Tank Operations**
- Daily tank dip recording (excludes oil tanks)
- Fuel delivery tracking with invoice management
- Variance calculation and tolerance checking
- Low fuel level alerts
- Book stock management for oil products

### **Financial Tracking**
- Multi-bank POS batch reconciliation
- Credit customer management with limits
- Safe balance tracking with inflow/outflow
- Expense categorization and approval workflows
- Comprehensive financial reporting

### **Professional Reporting**
- PDF exports with company branding
- Excel exports with multiple worksheets
- Daily operational summaries
- Monthly profit analysis with charts
- Tank movement and variance reports
- Pumper performance analytics

## 🔧 Configuration

### **Environment Variables**
Create a `.env.local` file in the root directory:
```env
# Add your environment variables here
# Example:
# DATABASE_URL=your_database_url
# NEXTAUTH_SECRET=your_secret_key
```

### **Customization**
- **Colors**: Modify `tailwind.config.js` for brand colors
- **Company Info**: Update company details in export utilities
- **Tolerance Settings**: Configure variance tolerances in settings
- **User Roles**: Customize role permissions in sidebar configuration

## 📊 System Statistics

- **44 Pages** with full functionality
- **42 API Endpoints** with comprehensive coverage
- **26 Reusable Components** for consistent UI
- **5 User Roles** with granular permissions
- **Production-Ready** with professional features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **shadcn/ui** for the beautiful component library
- **Tailwind CSS** for the utility-first CSS framework
- **Next.js** team for the amazing React framework
- **Recharts** for the data visualization components

## 📞 Support

For support and questions:
- Create an issue in this repository
- Contact: [CodeKnox](https://github.com/codeknox-lk)

---

**Built with ❤️ by CodeKnox** - Complete Fuel Station Management Solution