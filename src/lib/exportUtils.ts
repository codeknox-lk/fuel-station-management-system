import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// PDF Export Utilities
export class PDFExporter {
  private doc: jsPDF

  constructor(title: string, orientation: 'portrait' | 'landscape' = 'portrait') {
    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    })
    
    this.addHeader(title)
  }

  private addHeader(title: string) {
    // Add company logo/header
    this.doc.setFontSize(20)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Fuel Station Management System', 20, 20)
    
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(title, 20, 30)
    
    // Add date
    this.doc.setFontSize(10)
    this.doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 40)
    
    // Add line separator
    this.doc.setLineWidth(0.5)
    this.doc.line(20, 45, 190, 45)
  }

  addTable(headers: string[], data: any[][], title?: string) {
    let startY = 55
    
    if (title) {
      this.doc.setFontSize(14)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(title, 20, startY)
      startY += 10
    }

    autoTable(this.doc, {
      head: [headers],
      body: data,
      startY,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [63, 81, 181],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    })
  }

  addSummaryCards(summaryData: { label: string; value: string | number }[]) {
    const startY = (this.doc as any).lastAutoTable?.finalY + 20 || 70
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Summary', 20, startY)
    
    let currentY = startY + 10
    summaryData.forEach((item, index) => {
      const x = 20 + (index % 2) * 85
      if (index % 2 === 0 && index > 0) {
        currentY += 15
      }
      
      // Draw card background
      this.doc.setFillColor(248, 249, 250)
      this.doc.rect(x, currentY - 8, 80, 12, 'F')
      
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(item.label, x + 2, currentY - 2)
      
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(String(item.value), x + 2, currentY + 4)
    })
  }

  save(filename: string) {
    this.doc.save(filename)
  }

  getBlob(): Blob {
    return this.doc.output('blob')
  }
}

// Excel Export Utilities
export class ExcelExporter {
  private workbook: XLSX.WorkBook
  private worksheets: { [key: string]: any[][] } = {}

  constructor() {
    this.workbook = XLSX.utils.book_new()
  }

  addWorksheet(name: string, headers: string[], data: any[][]) {
    const worksheetData = [headers, ...data]
    this.worksheets[name] = worksheetData
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    
    // Auto-size columns
    const colWidths = headers.map((_, colIndex) => {
      const maxLength = Math.max(
        headers[colIndex]?.length || 0,
        ...data.map(row => String(row[colIndex] || '').length)
      )
      return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }
    })
    worksheet['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(this.workbook, worksheet, name)
  }

  addSummaryWorksheet(name: string, summaryData: { label: string; value: string | number }[]) {
    const data = summaryData.map(item => [item.label, item.value])
    this.addWorksheet(name, ['Metric', 'Value'], data)
  }

  save(filename: string) {
    XLSX.writeFile(this.workbook, filename)
  }

  getBuffer(): ArrayBuffer {
    return XLSX.write(this.workbook, { bookType: 'xlsx', type: 'array' })
  }
}

// Report-specific export functions
export const exportDailyReportPDF = (reportData: any, stationName: string, date: string) => {
  const pdf = new PDFExporter(`Daily Report - ${stationName} - ${date}`)
  
  // Sales breakdown
  const salesData = [
    ['Petrol 92', `${reportData.salesBreakdown?.petrol92?.litres || 0}L`, `Rs. ${(reportData.salesBreakdown?.petrol92?.amount || 0).toLocaleString()}`],
    ['Petrol 95', `${reportData.salesBreakdown?.petrol95?.litres || 0}L`, `Rs. ${(reportData.salesBreakdown?.petrol95?.amount || 0).toLocaleString()}`],
    ['Diesel', `${reportData.salesBreakdown?.diesel?.litres || 0}L`, `Rs. ${(reportData.salesBreakdown?.diesel?.amount || 0).toLocaleString()}`],
    ['Super Diesel', `${reportData.salesBreakdown?.superDiesel?.litres || 0}L`, `Rs. ${(reportData.salesBreakdown?.superDiesel?.amount || 0).toLocaleString()}`]
  ]
  pdf.addTable(['Fuel Type', 'Litres', 'Amount'], salesData, 'Sales Breakdown')
  
  // Summary cards
  const summaryData = [
    { label: 'Total Sales', value: `Rs. ${(reportData.totalSales || 0).toLocaleString()}` },
    { label: 'Total Expenses', value: `Rs. ${(reportData.totalExpenses || 0).toLocaleString()}` },
    { label: 'Net Profit', value: `Rs. ${(reportData.netProfit || 0).toLocaleString()}` },
    { label: 'Variance', value: `${(reportData.variancePercentage || 0).toFixed(2)}%` }
  ]
  pdf.addSummaryCards(summaryData)
  
  pdf.save(`daily-report-${stationName}-${date}.pdf`)
}

export const exportDailyReportExcel = (reportData: any, stationName: string, date: string) => {
  const excel = new ExcelExporter()
  
  // Sales breakdown
  const salesData = [
    ['Petrol 92', reportData.salesBreakdown?.petrol92?.litres || 0, reportData.salesBreakdown?.petrol92?.amount || 0],
    ['Petrol 95', reportData.salesBreakdown?.petrol95?.litres || 0, reportData.salesBreakdown?.petrol95?.amount || 0],
    ['Diesel', reportData.salesBreakdown?.diesel?.litres || 0, reportData.salesBreakdown?.diesel?.amount || 0],
    ['Super Diesel', reportData.salesBreakdown?.superDiesel?.litres || 0, reportData.salesBreakdown?.superDiesel?.amount || 0]
  ]
  excel.addWorksheet('Sales Breakdown', ['Fuel Type', 'Litres', 'Amount (Rs)'], salesData)
  
  // Summary
  const summaryData = [
    { label: 'Total Sales', value: reportData.totalSales || 0 },
    { label: 'Total Expenses', value: reportData.totalExpenses || 0 },
    { label: 'Net Profit', value: reportData.netProfit || 0 },
    { label: 'Variance %', value: reportData.variancePercentage || 0 }
  ]
  excel.addSummaryWorksheet('Summary', summaryData)
  
  excel.save(`daily-report-${stationName}-${date}.xlsx`)
}

export const exportShiftReportPDF = (shiftData: any, stationName: string, shiftId: string) => {
  const pdf = new PDFExporter(`Shift Report - ${stationName} - Shift ${shiftId}`)
  
  // Nozzle performance
  const nozzleData = shiftData.nozzlePerformance?.map((nozzle: any) => [
    nozzle.nozzleName,
    nozzle.pumperName,
    `${nozzle.litresSold}L`,
    `Rs. ${nozzle.amount.toLocaleString()}`,
    `${nozzle.variancePercentage.toFixed(2)}%`
  ]) || []
  
  pdf.addTable(['Nozzle', 'Pumper', 'Litres', 'Amount', 'Variance'], nozzleData, 'Nozzle Performance')
  
  // Summary
  const summaryData = [
    { label: 'Total Sales', value: `Rs. ${(shiftData.totalSales || 0).toLocaleString()}` },
    { label: 'Total Declared', value: `Rs. ${(shiftData.totalDeclared || 0).toLocaleString()}` },
    { label: 'Variance', value: `Rs. ${(shiftData.variance || 0).toLocaleString()}` },
    { label: 'Status', value: shiftData.overallStatus || 'Unknown' }
  ]
  pdf.addSummaryCards(summaryData)
  
  pdf.save(`shift-report-${stationName}-${shiftId}.pdf`)
}

export const exportTankReportPDF = (tankData: any[], stationName: string, date: string) => {
  const pdf = new PDFExporter(`Tank Movement Report - ${stationName} - ${date}`, 'landscape')
  
  const tankMovementData = tankData.map(tank => [
    tank.tankName,
    tank.fuelType,
    `${tank.openingStock}L`,
    `${tank.deliveries}L`,
    `${tank.sales}L`,
    `${tank.testReturns}L`,
    `${tank.closingBook}L`,
    `${tank.closingDip}L`,
    `${tank.variance}L`,
    `${tank.variancePercentage.toFixed(2)}%`,
    tank.status
  ])
  
  pdf.addTable([
    'Tank', 'Fuel Type', 'Opening', 'Deliveries', 'Sales', 'Test Returns', 
    'Closing Book', 'Closing Dip', 'Variance', 'Variance %', 'Status'
  ], tankMovementData, 'Tank Movement')
  
  pdf.save(`tank-report-${stationName}-${date}.pdf`)
}

export const exportProfitReportPDF = (profitData: any, stationName: string, month: string) => {
  const pdf = new PDFExporter(`Profit Report - ${stationName} - ${month}`)
  
  // Revenue breakdown
  const revenueData = profitData.revenueBreakdown?.map((item: any) => [
    item.source,
    `Rs. ${item.amount.toLocaleString()}`,
    `${item.percentage.toFixed(1)}%`
  ]) || []
  
  pdf.addTable(['Revenue Source', 'Amount', 'Percentage'], revenueData, 'Revenue Breakdown')
  
  // Expense breakdown
  const expenseData = profitData.expenseBreakdown?.map((item: any) => [
    item.category,
    `Rs. ${item.amount.toLocaleString()}`,
    `${item.percentage.toFixed(1)}%`
  ]) || []
  
  pdf.addTable(['Expense Category', 'Amount', 'Percentage'], expenseData, 'Expense Breakdown')
  
  // Summary
  const summaryData = [
    { label: 'Total Revenue', value: `Rs. ${(profitData.totalRevenue || 0).toLocaleString()}` },
    { label: 'Total Expenses', value: `Rs. ${(profitData.totalExpenses || 0).toLocaleString()}` },
    { label: 'Net Profit', value: `Rs. ${(profitData.netProfit || 0).toLocaleString()}` },
    { label: 'Profit Margin', value: `${(profitData.profitMargin || 0).toFixed(2)}%` }
  ]
  pdf.addSummaryCards(summaryData)
  
  pdf.save(`profit-report-${stationName}-${month}.pdf`)
}
