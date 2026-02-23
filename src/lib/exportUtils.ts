import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// PDF Export Utilities
export class PDFExporter {
  private doc: jsPDF
  private currentY: number = 50
  private pageWidth: number
  private pageHeight: number
  private margin: number = 20

  constructor(title: string, orientation: 'portrait' | 'landscape' = 'portrait') {
    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    })

    this.pageWidth = orientation === 'portrait' ? 210 : 297
    this.pageHeight = orientation === 'portrait' ? 297 : 210

    this.addProfessionalHeader(title)
    this.currentY = 55
  }

  private addProfessionalHeader(title: string) {
    // Background header
    this.doc.setFillColor(63, 81, 181) // Blue header
    this.doc.rect(0, 0, this.pageWidth, 50, 'F')

    // Company name
    this.doc.setFontSize(24)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('FUEL STATION', this.margin, 20)

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Management System', this.margin, 28)

    // Report title
    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(title, this.margin, 40)

    // Date and page info
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'normal')
    const dateStr = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    this.doc.text(dateStr, this.pageWidth - this.margin, 20, { align: 'right' })

    // Reset text color
    this.doc.setTextColor(0, 0, 0)
  }

  private checkPageBreak(requiredHeight: number) {
    if (this.currentY + requiredHeight > this.pageHeight - this.margin - 15) {
      this.addPageFooter()
      this.doc.addPage()
      this.currentY = this.margin
      this.addPageHeader()
      return true
    }
    return false
  }

  private addPageHeader() {
    // Minimal header for continuation pages
    this.doc.setFillColor(240, 240, 240)
    this.doc.rect(0, 0, this.pageWidth, 15, 'F')
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(63, 81, 181)
    this.doc.text('FUEL STATION MANAGEMENT SYSTEM', this.margin, 10)
    this.doc.setTextColor(0, 0, 0)
    this.currentY = 20
  }

  private addPageFooter() {
    interface ExtendedJsPDF {
      internal: {
        getNumberOfPages: () => number
      }
    }
    const pageNum = (this.doc as unknown as ExtendedJsPDF).internal.getNumberOfPages()
    this.doc.setFontSize(8)
    this.doc.setTextColor(128, 128, 128)
    this.doc.text(
      `Page ${pageNum}`,
      this.pageWidth / 2,
      this.pageHeight - 10,
      { align: 'center' }
    )
    this.doc.text(
      'Confidential - For Internal Use Only',
      this.pageWidth - this.margin,
      this.pageHeight - 10,
      { align: 'right' }
    )
    this.doc.setTextColor(0, 0, 0)
  }

  addSectionTitle(title: string) {
    this.checkPageBreak(15)

    // Section background
    this.doc.setFillColor(245, 247, 250)
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 10, 'F')

    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(63, 81, 181)
    this.doc.text(title, this.margin + 3, this.currentY + 7)
    this.doc.setTextColor(0, 0, 0)

    this.currentY += 15
  }

  addTable(headers: string[], data: (string | number)[][], title?: string) {
    if (title) {
      this.addSectionTitle(title)
    }

    this.checkPageBreak(30)

    autoTable(this.doc, {
      head: [headers],
      body: data,
      startY: this.currentY,
      margin: { left: this.margin, right: this.margin },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [220, 220, 220],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [63, 81, 181],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10,
        cellPadding: 4
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          this.addPageHeader()
        }
      }
    })

    interface AutoTableJsPDF {
      lastAutoTable?: {
        finalY: number
      }
    }
    const finalY = (this.doc as unknown as AutoTableJsPDF).lastAutoTable?.finalY || this.currentY
    this.currentY = finalY + 10
  }

  addStatisticsGrid(stats: { label: string; value: string | number; color?: string }[][]) {
    this.checkPageBreak(35)

    const cardWidth = (this.pageWidth - 2 * this.margin - 10) / stats[0].length
    const cardHeight = 25

    stats.forEach((row, rowIndex) => {
      const yPos = this.currentY + (rowIndex * (cardHeight + 5))

      row.forEach((stat, colIndex) => {
        const xPos = this.margin + (colIndex * (cardWidth + 5))

        // Card background
        this.doc.setFillColor(248, 249, 250)
        this.doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'F')

        // Border
        this.doc.setDrawColor(220, 220, 220)
        this.doc.setLineWidth(0.5)
        this.doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'S')

        // Label
        this.doc.setFontSize(8)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(100, 100, 100)
        this.doc.text(stat.label, xPos + 3, yPos + 7)

        // Value
        this.doc.setFontSize(16)
        this.doc.setFont('helvetica', 'bold')
        if (stat.color) {
          const colors = this.parseColor(stat.color)
          this.doc.setTextColor(colors[0], colors[1], colors[2])
        } else {
          this.doc.setTextColor(63, 81, 181)
        }
        this.doc.text(String(stat.value), xPos + 3, yPos + 18)

        this.doc.setTextColor(0, 0, 0)
      })
    })

    this.currentY += (stats.length * (cardHeight + 5)) + 10
  }

  private parseColor(color: string): [number, number, number] {
    // Simple color parser for common colors
    const colorMap: { [key: string]: [number, number, number] } = {
      'blue': [63, 81, 181],
      'green': [34, 197, 94],
      'red': [239, 68, 68],
      'orange': [249, 115, 22],
      'purple': [168, 85, 247],
      'yellow': [234, 179, 8]
    }
    return colorMap[color] || [63, 81, 181]
  }

  addChart(chartImageData: string, title: string, width?: number, height?: number) {
    const imgWidth = width || (this.pageWidth - 2 * this.margin)
    const imgHeight = height || 80

    this.checkPageBreak(imgHeight + 20)

    if (title) {
      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(title, this.margin, this.currentY)
      this.currentY += 8
    }

    try {
      this.doc.addImage(chartImageData, 'PNG', this.margin, this.currentY, imgWidth, imgHeight)
      this.currentY += imgHeight + 10
    } catch (error) {
      console.error('Failed to add chart image:', error)
      this.doc.setFontSize(10)
      this.doc.setTextColor(200, 0, 0)
      this.doc.text('Chart could not be rendered', this.margin, this.currentY)
      this.currentY += 10
      this.doc.setTextColor(0, 0, 0)
    }
  }

  // Native bar chart drawn using jsPDF primitives — no SVG/canvas needed
  addBarChart(
    title: string,
    labels: string[],
    datasets: { label: string; data: number[]; color: [number, number, number] }[],
    chartHeight: number = 70
  ) {
    this.checkPageBreak(chartHeight + 30)

    if (title) {
      this.addSectionTitle(title)
    }

    const chartWidth = this.pageWidth - 2 * this.margin
    const chartX = this.margin
    const chartY = this.currentY
    const maxVal = Math.max(...datasets.flatMap(d => d.data), 1)
    const barGroupWidth = chartWidth / Math.max(labels.length, 1)
    const barWidth = (barGroupWidth * 0.65) / datasets.length
    const barSpacing = barGroupWidth * 0.1

    // Draw chart border & background
    this.doc.setFillColor(250, 250, 252)
    this.doc.rect(chartX, chartY, chartWidth, chartHeight, 'F')
    this.doc.setDrawColor(220, 220, 220)
    this.doc.setLineWidth(0.3)
    this.doc.rect(chartX, chartY, chartWidth, chartHeight, 'S')

    // Grid lines — 5 lines (0% to 100%) using same coordinate system as bars
    // Data bottom = chartY + chartHeight - 2, data top = chartY + 2
    const innerH = chartHeight - 4 // same as bar height calculation
    const formatY = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v))
    for (let i = 0; i <= 4; i++) {
      // i=0 → top (maxVal), i=4 → bottom (0)
      const gY = chartY + 2 + (i / 4) * innerH
      const yVal = maxVal * (4 - i) / 4
      this.doc.setDrawColor(235, 235, 235)
      this.doc.setLineWidth(i === 4 ? 0.3 : 0.2)
      this.doc.line(chartX + 2, gY, chartX + chartWidth - 2, gY)
      this.doc.setFontSize(6)
      this.doc.setTextColor(140, 140, 140)
      this.doc.text(formatY(yVal), chartX + 1, gY + 1)
    }

    // Draw bars
    labels.forEach((label, li) => {
      const groupX = chartX + li * barGroupWidth + barSpacing

      datasets.forEach((ds, di) => {
        const val = ds.data[li] || 0
        const barH = maxVal > 0 ? (val / maxVal) * (chartHeight - 4) : 0
        const bX = groupX + di * (barWidth + 1)
        const bY = chartY + chartHeight - barH - 2

        this.doc.setFillColor(ds.color[0], ds.color[1], ds.color[2])
        this.doc.rect(bX, bY, barWidth, barH, 'F')
      })

      // X-axis label (every nth to avoid crowding)
      const step = Math.ceil(labels.length / 15)
      if (li % step === 0) {
        this.doc.setFontSize(5.5)
        this.doc.setTextColor(120, 120, 120)
        this.doc.text(label, groupX + (datasets.length * (barWidth + 1)) / 2, chartY + chartHeight + 3, { align: 'center' })
      }
    })

    // Legend
    let legendX = chartX
    const legendY = chartY + chartHeight + 8
    datasets.forEach(ds => {
      this.doc.setFillColor(ds.color[0], ds.color[1], ds.color[2])
      this.doc.rect(legendX, legendY - 3, 6, 3, 'F')
      this.doc.setFontSize(7)
      this.doc.setTextColor(60, 60, 60)
      this.doc.text(ds.label, legendX + 8, legendY)
      legendX += 8 + this.doc.getTextWidth(ds.label) + 6
    })

    this.doc.setTextColor(0, 0, 0)
    this.currentY = legendY + 8
  }

  // Native line chart drawn using jsPDF primitives — no SVG/canvas needed
  addLineChart(
    title: string,
    labels: string[],
    datasets: { label: string; data: number[]; color: [number, number, number] }[],
    chartHeight: number = 70
  ) {
    this.checkPageBreak(chartHeight + 30)

    if (title) {
      this.addSectionTitle(title)
    }

    const chartWidth = this.pageWidth - 2 * this.margin
    const chartX = this.margin
    const chartY = this.currentY
    const maxVal = Math.max(...datasets.flatMap(d => d.data), 1)
    const n = Math.max(labels.length - 1, 1)

    // Background
    this.doc.setFillColor(250, 250, 252)
    this.doc.rect(chartX, chartY, chartWidth, chartHeight, 'F')
    this.doc.setDrawColor(220, 220, 220)
    this.doc.setLineWidth(0.3)
    this.doc.rect(chartX, chartY, chartWidth, chartHeight, 'S')

    // Grid lines — 5 lines using same coordinate system as data points
    // Data bottom = chartY + chartHeight - 2, data top = chartY + 2
    const innerH = chartHeight - 4
    const formatY = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v))
    for (let i = 0; i <= 4; i++) {
      // i=0 → top (maxVal), i=4 → bottom (0)
      const gY = chartY + 2 + (i / 4) * innerH
      const yVal = maxVal * (4 - i) / 4
      this.doc.setDrawColor(235, 235, 235)
      this.doc.setLineWidth(i === 4 ? 0.3 : 0.2)
      this.doc.line(chartX + 2, gY, chartX + chartWidth - 2, gY)
      this.doc.setFontSize(6)
      this.doc.setTextColor(140, 140, 140)
      this.doc.text(formatY(yVal), chartX + 1, gY + 1)
    }

    // Draw lines
    datasets.forEach(ds => {
      this.doc.setDrawColor(ds.color[0], ds.color[1], ds.color[2])
      this.doc.setLineWidth(0.8)

      for (let i = 0; i < ds.data.length - 1; i++) {
        const x1 = chartX + (i / n) * chartWidth
        const y1 = chartY + chartHeight - ((ds.data[i] || 0) / maxVal) * (chartHeight - 4) - 2
        const x2 = chartX + ((i + 1) / n) * chartWidth
        const y2 = chartY + chartHeight - ((ds.data[i + 1] || 0) / maxVal) * (chartHeight - 4) - 2
        this.doc.line(x1, y1, x2, y2)
      }

      // Dots at each point
      this.doc.setFillColor(ds.color[0], ds.color[1], ds.color[2])
      const step = Math.ceil(ds.data.length / 20) // limit dots to avoid crowding
      ds.data.forEach((val, i) => {
        if (i % step !== 0 && i !== ds.data.length - 1) return
        const x = chartX + (i / n) * chartWidth
        const y = chartY + chartHeight - (val / maxVal) * (chartHeight - 4) - 2
        this.doc.circle(x, y, 0.8, 'F')
      })
    })

    // X-axis labels (show every nth)
    const labelStep = Math.ceil(labels.length / 15)
    labels.forEach((label, i) => {
      if (i % labelStep !== 0 && i !== labels.length - 1) return
      const x = chartX + (i / n) * chartWidth
      this.doc.setFontSize(5.5)
      this.doc.setTextColor(120, 120, 120)
      this.doc.text(label, x, chartY + chartHeight + 3, { align: 'center' })
    })

    // Legend
    let legendX = chartX
    const legendY = chartY + chartHeight + 8
    datasets.forEach(ds => {
      this.doc.setDrawColor(ds.color[0], ds.color[1], ds.color[2])
      this.doc.setLineWidth(1.5)
      this.doc.line(legendX, legendY - 1.5, legendX + 8, legendY - 1.5)
      this.doc.setFontSize(7)
      this.doc.setTextColor(60, 60, 60)
      this.doc.text(ds.label, legendX + 10, legendY)
      legendX += 10 + this.doc.getTextWidth(ds.label) + 6
    })

    this.doc.setTextColor(0, 0, 0)
    this.doc.setLineWidth(0.3)
    this.currentY = legendY + 8
  }



  addKeyValuePairs(data: { label: string; value: string | number }[], columns: number = 2) {
    this.checkPageBreak(data.length * 8 / columns)

    const colWidth = (this.pageWidth - 2 * this.margin) / columns

    data.forEach((item, index) => {
      const col = index % columns
      const row = Math.floor(index / columns)
      const xPos = this.margin + (col * colWidth)
      const yPos = this.currentY + (row * 8)

      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(`${item.label}:`, xPos, yPos)

      this.doc.setFont('helvetica', 'normal')
      this.doc.text(String(item.value), xPos + 50, yPos)
    })

    this.currentY += Math.ceil(data.length / columns) * 8 + 10
  }

  addDivider() {
    this.checkPageBreak(5)
    this.doc.setDrawColor(220, 220, 220)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 8
  }

  addText(text: string, fontSize: number = 10, bold: boolean = false) {
    this.checkPageBreak(10)
    this.doc.setFontSize(fontSize)
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')

    const lines = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin)
    this.doc.text(lines, this.margin, this.currentY)
    this.currentY += lines.length * (fontSize * 0.5) + 5
  }

  addSummaryCards(summaryData: { label: string; value: string | number }[]) {
    this.addSectionTitle('Summary')

    const cardWidth = 85
    const cardHeight = 20
    const cols = 2

    summaryData.forEach((item, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const x = this.margin + (col * (cardWidth + 5))
      const y = this.currentY + (row * (cardHeight + 5))

      this.checkPageBreak(cardHeight + 10)

      // Card background with gradient effect
      this.doc.setFillColor(248, 249, 250)
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F')

      // Border
      this.doc.setDrawColor(220, 220, 220)
      this.doc.setLineWidth(0.5)
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S')

      // Label
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(100, 100, 100)
      this.doc.text(item.label, x + 3, y + 7)

      // Value
      this.doc.setFontSize(14)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(63, 81, 181)
      this.doc.text(String(item.value), x + 3, y + 16)

      this.doc.setTextColor(0, 0, 0)
    })

    this.currentY += Math.ceil(summaryData.length / cols) * (cardHeight + 5) + 10
  }

  save(filename: string) {
    // Add footer to all pages
    interface ExtendedJsPDF {
      internal: {
        getNumberOfPages: () => number
      }
    }
    const pageCount = (this.doc as unknown as ExtendedJsPDF).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(8)
      this.doc.setTextColor(128, 128, 128)
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      )
      this.doc.text(
        'Confidential - For Internal Use Only',
        this.pageWidth - this.margin,
        this.pageHeight - 10,
        { align: 'right' }
      )
      this.doc.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        this.margin,
        this.pageHeight - 10
      )
    }

    this.doc.save(filename)
  }

  getBlob(): Blob {
    return this.doc.output('blob')
  }
}

// Excel Export Utilities
export class ExcelExporter {
  private workbook: XLSX.WorkBook
  private worksheets: { [key: string]: (string | number)[][] } = {}

  constructor() {
    this.workbook = XLSX.utils.book_new()
  }

  addWorksheet(name: string, headers: string[], data: (string | number)[][]) {
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

// Chart capture utility - Inlines computed styles for reliable SVG → Canvas rendering
export const captureChartAsImage = async (chartId: string): Promise<string | null> => {
  try {
    const chartElement = document.getElementById(chartId)
    if (!chartElement) {
      console.warn(`Chart element with ID "${chartId}" not found`)
      return null
    }

    const svgElement = chartElement.querySelector('svg')
    if (!svgElement) {
      console.warn(`SVG element not found in chart "${chartId}"`)
      return null
    }

    // Get real dimensions from the bounding rect
    const bbox = svgElement.getBoundingClientRect()
    const width = Math.round(bbox.width) || 800
    const height = Math.round(bbox.height) || 400

    // Clone the SVG so we can mutate it without affecting the page
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement

    // Set explicit width/height and viewBox so canvas scales correctly
    clonedSvg.setAttribute('width', String(width))
    clonedSvg.setAttribute('height', String(height))
    if (!clonedSvg.getAttribute('viewBox')) {
      clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    }

    // Inline computed styles from the LIVE element onto the CLONE element
    // This is the key step — recharts colors are set via computed CSS, not inline styles
    const inlineStyles = (liveEl: Element, clonedEl: Element) => {
      if (liveEl.nodeType !== Node.ELEMENT_NODE) return

      const computed = window.getComputedStyle(liveEl)
      const style = (clonedEl as HTMLElement).style

      // Only copy the properties that matter for SVG rendering
      const svgProps = [
        'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity',
        'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin',
        'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline',
        'opacity', 'visibility', 'display', 'color', 'letter-spacing'
      ]

      svgProps.forEach(prop => {
        const val = computed.getPropertyValue(prop)
        if (val && val !== '' && val !== 'none' && val !== 'initial' && val !== 'inherit') {
          // Convert to camelCase for style assignment
          const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ; (style as any)[camel] = val
          } catch {
            // Some properties may be read-only; skip
          }
        }
      })

      // Recurse into children
      const liveChildren = Array.from(liveEl.children)
      const clonedChildren = Array.from(clonedEl.children)
      liveChildren.forEach((child, i) => {
        if (clonedChildren[i]) inlineStyles(child, clonedChildren[i])
      })
    }

    inlineStyles(svgElement, clonedSvg)

    // Set white background explicitly
    clonedSvg.style.background = 'white'

    // Serialize to string
    const serializer = new XMLSerializer()
    const svgString = '<?xml version="1.0" encoding="UTF-8"?>' + serializer.serializeToString(clonedSvg)

    // Render at 2x resolution for crispness
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.scale(scale, scale)

    return new Promise<string | null>((resolve) => {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/png', 1.0))
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        console.warn('SVG blob image failed; trying inline data URI fallback')
        // Fallback: use data URI directly (avoids blob CORS issues in some browsers)
        const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString)
        const img2 = new Image()
        img2.onload = () => {
          ctx.drawImage(img2, 0, 0, width, height)
          resolve(canvas.toDataURL('image/png', 1.0))
        }
        img2.onerror = () => resolve(null)
        img2.src = dataUri
      }
      img.src = url
    })
  } catch (error) {
    console.error('Error capturing chart:', error)
    return null
  }
}


// Report-specific export functions
export interface DailyReportData {
  salesBreakdown?: {
    petrol92?: { litres: number; amount: number }
    petrol95?: { litres: number; amount: number }
    diesel?: { litres: number; amount: number }
    superDiesel?: { litres: number; amount: number }
  }
  shopSales?: number
  totalSales?: number
  totalExpenses?: number
  netProfit?: number
  variancePercentage?: number
}

export const exportDailyReportPDF = (reportData: DailyReportData, stationName: string, date: string): void => {
  const pdf = new PDFExporter(`Daily Report - ${stationName} - ${date}`)

  // Sales breakdown
  const salesData = [
    ['Petrol 92', `${reportData.salesBreakdown?.petrol92?.litres || 0}L`, `Rs. ${(reportData.salesBreakdown?.petrol92?.amount || 0).toLocaleString()}`],
    ['Petrol 95', `${reportData.salesBreakdown?.petrol95?.litres || 0}L`, `Rs. ${(reportData.salesBreakdown?.petrol95?.amount || 0).toLocaleString()}`],
    ['Diesel', `${reportData.salesBreakdown?.diesel?.litres || 0}L`, `Rs. ${(reportData.salesBreakdown?.diesel?.amount || 0).toLocaleString()}`],
    ['Super Diesel', `${reportData.salesBreakdown?.superDiesel?.litres || 0}L`, `Rs. ${(reportData.salesBreakdown?.superDiesel?.amount || 0).toLocaleString()}`],
    ['Shop Sales', '-', `Rs. ${(reportData.shopSales || 0).toLocaleString()}`]
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

export const exportDailyReportExcel = (reportData: DailyReportData, stationName: string, date: string) => {
  const excel = new ExcelExporter()

  // Sales breakdown
  const salesData = [
    ['Petrol 92', reportData.salesBreakdown?.petrol92?.litres || 0, reportData.salesBreakdown?.petrol92?.amount || 0],
    ['Petrol 95', reportData.salesBreakdown?.petrol95?.litres || 0, reportData.salesBreakdown?.petrol95?.amount || 0],
    ['Diesel', reportData.salesBreakdown?.diesel?.litres || 0, reportData.salesBreakdown?.diesel?.amount || 0],
    ['Super Diesel', reportData.salesBreakdown?.superDiesel?.litres || 0, reportData.salesBreakdown?.superDiesel?.amount || 0],
    ['Shop Sales', '-', reportData.shopSales || 0]
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

interface ShiftReportData {
  nozzlePerformance?: Array<{
    nozzleName: string
    pumperName: string
    litresSold: number
    amount: number
    variancePercentage: number
  }>
  shopSales?: number
  shopPerformance?: Array<{
    productName: string
    soldQuantity: number
    revenue: number
  }>
  totalSales?: number
  totalDeclared?: number
  variance?: number
  overallStatus?: string
}

export const exportShiftReportPDF = (shiftData: ShiftReportData, stationName: string, shiftId: string) => {
  const pdf = new PDFExporter(`Shift Report - ${stationName} - Shift ${shiftId}`)

  // Nozzle performance
  const nozzleData = shiftData.nozzlePerformance?.map((nozzle) => [
    nozzle.nozzleName,
    nozzle.pumperName,
    `${nozzle.litresSold}L`,
    `Rs. ${nozzle.amount.toLocaleString()}`,
    `${nozzle.variancePercentage.toFixed(2)}%`
  ]) || []

  pdf.addTable(['Nozzle', 'Pumper', 'Litres', 'Amount', 'Variance'], nozzleData, 'Nozzle Performance')

  // Shop performance if available
  if (shiftData.shopPerformance && shiftData.shopPerformance.length > 0) {
    const shopData = shiftData.shopPerformance.map((item) => [
      item.productName,
      item.soldQuantity.toString(),
      `Rs. ${item.revenue.toLocaleString()}`
    ])
    pdf.addTable(['Product', 'Qty Sold', 'Revenue'], shopData, 'Shop Sales Breakdown')
  }

  // Summary
  const summaryData = [
    { label: 'Fuel Sales', value: `Rs. ${(shiftData.totalSales || 0).toLocaleString()}` },
    { label: 'Shop Sales', value: `Rs. ${(shiftData.shopSales || 0).toLocaleString()}` },
    { label: 'Total Declared', value: `Rs. ${(shiftData.totalDeclared || 0).toLocaleString()}` },
    { label: 'Variance', value: `Rs. ${(shiftData.variance || 0).toLocaleString()}` },
    { label: 'Status', value: shiftData.overallStatus || 'Unknown' }
  ]
  pdf.addSummaryCards(summaryData)

  pdf.save(`shift-report-${stationName}-${shiftId}.pdf`)
}

interface TankReportData {
  tankName: string
  fuelName: string
  openingStock: number
  deliveries: number
  sales: number
  testReturns: number
  closingBook: number
  closingDip: number
  variance: number
  variancePercentage: number
  status: string
}

export const exportTankReportPDF = (tankData: TankReportData[], stationName: string, date: string) => {
  const pdf = new PDFExporter(`Tank Movement Report - ${stationName} - ${date}`, 'landscape')

  const tankMovementData = tankData.map(tank => [
    tank.tankName,
    tank.fuelName,
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

interface ProfitReportData {
  revenueBreakdown?: Array<{
    category: string
    amount: number
    percentage: number
  }>
  expenseBreakdown?: Array<{
    category: string
    amount: number
    percentage: number
  }>
  totalRevenue?: number
  totalExpenses?: number
  netProfit?: number
  profitMargin?: number
}

export const exportProfitReportPDF = (profitData: ProfitReportData, stationName: string, month: string) => {
  const pdf = new PDFExporter(`Profit Report - ${stationName} - ${month}`)

  // Revenue breakdown
  const revenueData = profitData.revenueBreakdown?.map((item) => [
    item.category,
    `Rs. ${item.amount.toLocaleString()}`,
    `${item.percentage.toFixed(1)}%`
  ]) || []

  pdf.addTable(['Revenue Source', 'Amount', 'Percentage'], revenueData, 'Revenue Breakdown')

  // Expense breakdown
  const expenseData = profitData.expenseBreakdown?.map((item) => [
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

interface SalaryReportData {
  pumperId: string
  pumperName: string
  employeeId?: string
  baseSalary: number
  shiftCount: number
  totalHours: number
  totalSales: number
  totalAdvances: number
  totalLoans: number
  varianceAdd: number
  varianceDeduct: number
  netSalary: number
}

export interface IndividualSalaryReportData {
  pumperId: string
  pumperName: string
  employeeId?: string
  monthLabel: string
  stationName: string
  baseSalary: number
  holidayAllowance: number
  totalOvertimeAmount: number
  commission: number
  varianceAdd: number
  totalAdvances: number
  totalLoans: number
  varianceDeduct: number
  epf: number
  netSalary: number
  shiftDetails: Array<{
    shiftId: string
    date: string
    hours: number
    sales: number
    advance: number
    variance: number
    varianceStatus: string
    overtimeAmount: number
  }>
}

export const exportIndividualSalaryReportPDF = (data: IndividualSalaryReportData) => {
  const pdf = new PDFExporter(`Salary Report - ${data.pumperName} - ${data.monthLabel}`)

  // Employee details
  pdf.addSectionTitle('Employee Information')
  pdf.addKeyValuePairs([
    { label: 'Pumper Name', value: data.pumperName },
    { label: 'Employee ID', value: data.employeeId || 'N/A' },
    { label: 'Station', value: data.stationName },
    { label: 'Month', value: data.monthLabel }
  ], 2)
  pdf.addDivider()

  // Salary breakdown
  pdf.addSectionTitle('Net Salary Calculation')
  pdf.addStatisticsGrid([[
    { label: 'Base Salary', value: `Rs. ${data.baseSalary.toLocaleString()}`, color: 'blue' },
    { label: 'Additions', value: `Rs. ${(data.holidayAllowance + data.totalOvertimeAmount + data.commission + data.varianceAdd).toLocaleString()}`, color: 'green' },
    { label: 'Deductions', value: `Rs. ${(data.totalAdvances + data.totalLoans + data.varianceDeduct + data.epf).toLocaleString()}`, color: 'red' },
    { label: 'Net Salary', value: `Rs. ${data.netSalary.toLocaleString()}`, color: 'purple' }
  ]])
  pdf.addDivider()

  // Detailed additions
  pdf.addSectionTitle('Earnings & Additions')
  pdf.addKeyValuePairs([
    { label: 'Holiday Allowance', value: `Rs. ${data.holidayAllowance.toLocaleString()}` },
    { label: 'Overtime Pay', value: `Rs. ${data.totalOvertimeAmount.toLocaleString()}` },
    { label: 'Commission', value: `Rs. ${data.commission.toLocaleString()}` },
    { label: 'Variance Bonuses', value: `Rs. ${data.varianceAdd.toLocaleString()}` }
  ], 2)

  // Detailed deductions
  pdf.addSectionTitle('Deductions')
  pdf.addKeyValuePairs([
    { label: 'Shift Advances', value: `Rs. ${data.totalAdvances.toLocaleString()}` },
    { label: 'Loan Deductions', value: `Rs. ${data.totalLoans.toLocaleString()}` },
    { label: 'Variance Deductions', value: `Rs. ${data.varianceDeduct.toLocaleString()}` },
    { label: 'EPF (8%)', value: `Rs. ${data.epf.toLocaleString()}` }
  ], 2)
  pdf.addDivider()

  // Shift breakdown table
  pdf.addSectionTitle('Shift-by-Shift Breakdown')
  const shiftTableData = data.shiftDetails.map((shift) => [
    new Date(shift.date).toLocaleDateString(),
    shift.shiftId.slice(0, 8),
    `${shift.hours.toFixed(1)}h`,
    `Rs. ${shift.sales.toLocaleString()}`,
    `Rs. ${shift.overtimeAmount.toLocaleString()}`,
    `Rs. ${shift.advance.toLocaleString()}`,
    `Rs. ${shift.variance.toLocaleString()}`
  ])

  pdf.addTable([
    'Date',
    'Shift ID',
    'Hours',
    'Sales',
    'Overtime',
    'Advances',
    'Variance'
  ], shiftTableData, 'Detailed Shift Records')

  pdf.save(`salary-report-${data.pumperName.replace(/\s+/g, '-')}-${data.monthLabel}.pdf`)
}

export const exportIndividualSalaryReportExcel = (data: IndividualSalaryReportData) => {
  const excel = new ExcelExporter()

  // Summary worksheet
  const summaryData = [
    { label: 'Pumper Name', value: data.pumperName },
    { label: 'Employee ID', value: data.employeeId || 'N/A' },
    { label: 'Month', value: data.monthLabel },
    { label: 'Station', value: data.stationName },
    { label: 'Base Salary', value: data.baseSalary },
    { label: 'Holiday Allowance', value: data.holidayAllowance },
    { label: 'Overtime Amount', value: data.totalOvertimeAmount },
    { label: 'Commission', value: data.commission },
    { label: 'Variance Bonuses', value: data.varianceAdd },
    { label: 'Total Advances', value: data.totalAdvances },
    { label: 'Total Loans', value: data.totalLoans },
    { label: 'Variance Deductions', value: data.varianceDeduct },
    { label: 'EPF (8%)', value: data.epf },
    { label: 'Net Salary', value: data.netSalary }
  ]
  excel.addSummaryWorksheet('Salary Summary', summaryData)

  // Shift details worksheet
  const shiftData = data.shiftDetails.map(shift => [
    new Date(shift.date).toLocaleDateString(),
    shift.shiftId,
    shift.hours,
    shift.sales,
    shift.overtimeAmount,
    shift.advance,
    shift.variance,
    shift.varianceStatus
  ])

  excel.addWorksheet('Shift Records', [
    'Date',
    'Shift ID',
    'Hours',
    'Sales (Rs)',
    'Overtime (Rs)',
    'Advances (Rs)',
    'Variance (Rs)',
    'Variance Status'
  ], shiftData)

  excel.save(`salary-report-${data.pumperName.replace(/\s+/g, '-')}-${data.monthLabel}.xlsx`)
}

export const exportSalaryReportPDF = (salaryData: SalaryReportData[], monthLabel: string) => {
  const pdf = new PDFExporter(`Monthly Salary Report - ${monthLabel}`, 'landscape')

  // Salary breakdown table
  const salaryTableData = salaryData.map((pumper) => [
    pumper.pumperName,
    pumper.employeeId || 'N/A',
    `${pumper.shiftCount}`,
    `${pumper.totalHours.toFixed(1)}h`,
    `Rs. ${pumper.totalSales.toLocaleString()}`,
    `Rs. ${pumper.baseSalary.toLocaleString()}`,
    `Rs. ${pumper.totalAdvances.toLocaleString()}`,
    `Rs. ${pumper.totalLoans.toLocaleString()}`,
    pumper.varianceAdd > 0 ? `+Rs. ${pumper.varianceAdd.toLocaleString()}` :
      pumper.varianceDeduct > 0 ? `-Rs. ${pumper.varianceDeduct.toLocaleString()}` : '-',
    `Rs. ${pumper.netSalary.toLocaleString()}`
  ])

  pdf.addTable([
    'Pumper',
    'Employee ID',
    'Shifts',
    'Hours',
    'Total Sales',
    'Base Salary',
    'Advances',
    'Loans',
    'Variance',
    'Net Salary'
  ], salaryTableData, 'Monthly Salary Breakdown')

  // Summary
  const totalBaseSalary = salaryData.reduce((sum, p) => sum + p.baseSalary, 0)
  const totalAdvances = salaryData.reduce((sum, p) => sum + p.totalAdvances, 0)
  const totalLoans = salaryData.reduce((sum, p) => sum + p.totalLoans, 0)
  const totalVarianceAdd = salaryData.reduce((sum, p) => sum + p.varianceAdd, 0)
  const totalVarianceDeduct = salaryData.reduce((sum, p) => sum + p.varianceDeduct, 0)
  const totalNetSalary = salaryData.reduce((sum, p) => sum + p.netSalary, 0)

  const summaryData = [
    { label: 'Total Pumpers', value: salaryData.length.toString() },
    { label: 'Total Base Salary', value: `Rs. ${totalBaseSalary.toLocaleString()}` },
    { label: 'Total Advances', value: `Rs. ${totalAdvances.toLocaleString()}` },
    { label: 'Total Loans', value: `Rs. ${totalLoans.toLocaleString()}` },
    { label: 'Total Variance Bonuses', value: `Rs. ${totalVarianceAdd.toLocaleString()}` },
    { label: 'Total Variance Deductions', value: `Rs. ${totalVarianceDeduct.toLocaleString()}` },
    { label: 'Total Net Salary', value: `Rs. ${totalNetSalary.toLocaleString()}` }
  ]
  pdf.addSummaryCards(summaryData)

  pdf.save(`salary-report-${monthLabel.replace(/\s+/g, '-')}.pdf`)
}

// Daily Sales Report (Rs) Export
interface DailySalesReportData {
  dailySales: Array<{
    date: string
    sales: Record<string, number>
    totalSales: number
  }>
  fuelTypes: string[]
  grandTotal: number
}

export const exportDailySalesReportPDF = (reportData: DailySalesReportData, stationName: string, monthLabel: string) => {
  const pdf = new PDFExporter(`Daily Sales Report (Rs) - ${stationName} - ${monthLabel}`, 'landscape')

  const totalDays = reportData.dailySales.length || 1
  const totalRevenue = reportData.grandTotal || 0
  const avgDaily = totalDays > 0 ? Math.round(totalRevenue / totalDays) : 0

  const maxDay = reportData.dailySales.length > 0
    ? reportData.dailySales.reduce((max, day) => day.totalSales > max.totalSales ? day : max)
    : { totalSales: 0, date: '' }
  const minDay = reportData.dailySales.length > 0
    ? reportData.dailySales.reduce((min, day) => day.totalSales < min.totalSales ? day : min)
    : { totalSales: 0, date: '' }

  // Report Information
  pdf.addSectionTitle('Report Information')
  pdf.addKeyValuePairs([
    { label: 'Reporting Period', value: monthLabel },
    { label: 'Station', value: stationName },
    { label: 'Total Days in Period', value: totalDays.toString() },
    { label: 'Report Generated', value: new Date().toLocaleString() }
  ], 2)

  pdf.addDivider()

  // Key Performance Metrics
  pdf.addSectionTitle('Key Performance Metrics')
  const statsGrid = [
    [
      { label: 'Total Revenue', value: `Rs. ${totalRevenue.toLocaleString()}`, color: 'blue' },
      { label: 'Average Daily Sales', value: `Rs. ${avgDaily.toLocaleString()}`, color: 'purple' },
      { label: 'Fuel Types Sold', value: reportData.fuelTypes.length.toString(), color: 'green' }
    ],
    [
      { label: 'Best Day Revenue', value: `Rs. ${maxDay.totalSales.toLocaleString()}`, color: 'green' },
      { label: 'Lowest Day Revenue', value: `Rs. ${minDay.totalSales.toLocaleString()}`, color: 'orange' },
      { label: 'Revenue Range', value: `Rs. ${(maxDay.totalSales - minDay.totalSales).toLocaleString()}`, color: 'blue' }
    ]
  ]
  pdf.addStatisticsGrid(statsGrid)

  pdf.addDivider()

  // Sales Trend Chart — drawn natively with jsPDF (no SVG capture needed)
  if (reportData.dailySales.length > 0) {
    const chartLabels = reportData.dailySales.map(day => {
      const d = new Date(day.date)
      return `${d.getDate()}/${d.getMonth() + 1}`
    })

    // Color palette for fuel types
    const palette: [number, number, number][] = [
      [59, 130, 246],  // blue
      [139, 92, 246],  // purple
      [16, 185, 129],  // green
      [245, 158, 11],  // amber
      [236, 72, 153],  // pink
      [239, 68, 68],   // red
    ]

    const chartDatasets = reportData.fuelTypes.map((fuelName, idx) => ({
      label: fuelName,
      data: reportData.dailySales.map(day => day.sales[fuelName] || 0),
      color: palette[idx % palette.length]
    }))

    // Add a "Total" line as well
    chartDatasets.push({
      label: 'Total',
      data: reportData.dailySales.map(day => day.totalSales),
      color: [249, 115, 22] // orange
    })

    pdf.addLineChart('Daily Sales Trend', chartLabels, chartDatasets, 80)
    pdf.addDivider()
  }


  // Revenue by Fuel Type
  pdf.addSectionTitle('Revenue Breakdown by Fuel Type')
  const fuelBreakdown: { label: string; value: string }[] = reportData.fuelTypes.map(fuelName => {
    const total = reportData.dailySales.reduce((sum, day) => sum + (day.sales[fuelName] || 0), 0)
    const percentage = totalRevenue > 0 ? ((total / totalRevenue) * 100).toFixed(1) : '0.0'
    return {
      label: fuelName,
      value: `Rs. ${total.toLocaleString()} (${percentage}%)`
    }
  })
  pdf.addKeyValuePairs(fuelBreakdown, 2)

  pdf.addDivider()

  // Complete Daily Sales Table
  pdf.addSectionTitle('Daily Sales Details')
  const salesData = reportData.dailySales.map((day) => {
    const row: (string | number)[] = [
      new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    ]
    reportData.fuelTypes.forEach(fuelName => {
      row.push(`Rs. ${(day.sales[fuelName] || 0).toLocaleString()}`)
    })
    row.push(`Rs. ${day.totalSales.toLocaleString()}`)
    return row
  })

  // Add totals row
  const totalsRow: (string | number)[] = ['TOTAL']
  reportData.fuelTypes.forEach(fuelName => {
    const total = reportData.dailySales.reduce((sum, day) => sum + (day.sales[fuelName] || 0), 0)
    totalsRow.push(`Rs. ${total.toLocaleString()}`)
  })
  totalsRow.push(`Rs. ${totalRevenue.toLocaleString()}`)
  salesData.push(totalsRow)

  const headers = ['Date', ...reportData.fuelTypes, 'Daily Total']
  pdf.addTable(headers, salesData)

  pdf.save(`daily-sales-rs-${stationName.replace(/\s+/g, '-')}-${monthLabel.replace(/\s+/g, '-')}.pdf`)
}

export const exportDailySalesReportExcel = (reportData: DailySalesReportData, stationName: string, monthLabel: string) => {
  const excel = new ExcelExporter()

  const totalDays = reportData.dailySales.length || 1
  const totalRevenue = reportData.grandTotal || 0
  const avgDaily = Math.round(totalRevenue / totalDays)

  const maxDay = reportData.dailySales.length > 0
    ? reportData.dailySales.reduce((max, day) => day.totalSales > max.totalSales ? day : max)
    : { totalSales: 0 }
  const minDay = reportData.dailySales.length > 0
    ? reportData.dailySales.reduce((min, day) => day.totalSales < min.totalSales ? day : min)
    : { totalSales: 0 }

  // Daily sales data with totals
  const salesData = reportData.dailySales.map((day) => {
    const row: (string | number)[] = [new Date(day.date).toLocaleDateString()]
    reportData.fuelTypes.forEach(fuelName => {
      row.push(day.sales[fuelName] || 0)
    })
    row.push(day.totalSales)
    return row
  })

  // Add totals row
  const totalsRow: (string | number)[] = ['TOTAL']
  reportData.fuelTypes.forEach(fuelName => {
    const total = reportData.dailySales.reduce((sum, day) => sum + (day.sales[fuelName] || 0), 0)
    totalsRow.push(total)
  })
  totalsRow.push(totalRevenue)
  salesData.push(totalsRow)

  const headers = ['Date', ...reportData.fuelTypes, 'Daily Total (Rs)']
  excel.addWorksheet('Daily Sales', headers, salesData)

  // Fuel type breakdown
  const fuelBreakdown = reportData.fuelTypes.map(fuelName => {
    const total = reportData.dailySales.reduce((sum, day) => sum + (day.sales[fuelName] || 0), 0)
    const percentage = totalRevenue > 0 ? ((total / totalRevenue) * 100).toFixed(2) : '0.00'
    return [
      fuelName,
      total,
      `${percentage}%`
    ]
  })
  excel.addWorksheet('Fuel Type Breakdown', ['Fuel Type', 'Total Revenue (Rs)', 'Percentage'], fuelBreakdown)

  // Summary with all metrics
  const summaryData = [
    { label: 'Station', value: stationName },
    { label: 'Reporting Period', value: monthLabel },
    { label: 'Total Days', value: totalDays },
    { label: 'Total Revenue (Rs)', value: totalRevenue },
    { label: 'Average Daily Sales (Rs)', value: avgDaily },
    { label: 'Best Day Revenue (Rs)', value: maxDay.totalSales },
    { label: 'Lowest Day Revenue (Rs)', value: minDay.totalSales },
    { label: 'Revenue Range (Rs)', value: maxDay.totalSales - minDay.totalSales },
    { label: 'Fuel Types Sold', value: reportData.fuelTypes.length }
  ]
  excel.addSummaryWorksheet('Summary', summaryData)

  excel.save(`daily-sales-rs-${stationName.replace(/\s+/g, '-')}-${monthLabel.replace(/\s+/g, '-')}.xlsx`)
}

// Daily Sales Liters Report Export
interface DailySalesLitersData {
  dailySales: Array<{
    date: string
    sales: Record<string, number>
    totalLiters: number
  }>
  fuelTypes: string[]
  grandTotal: number
}

export const exportDailySalesLitersReportPDF = (reportData: DailySalesLitersData, stationName: string, monthLabel: string) => {
  const pdf = new PDFExporter(`Daily Sales Report (Liters) - ${stationName} - ${monthLabel}`, 'landscape')

  // Daily sales table
  const salesData = reportData.dailySales.map((day) => {
    const row: (string | number)[] = [day.date]
    reportData.fuelTypes.forEach(fuelName => {
      row.push(`${(day.sales[fuelName] || 0).toLocaleString()} L`)
    })
    row.push(`${day.totalLiters.toLocaleString()} L`)
    return row
  })

  const headers = ['Date', ...reportData.fuelTypes, 'Total']
  pdf.addTable(headers, salesData, 'Daily Sales Breakdown (Volume)')

  // Summary
  const summaryData = [
    { label: 'Total Days', value: reportData.dailySales.length.toString() },
    { label: 'Total Volume', value: `${reportData.grandTotal.toLocaleString()} L` },
    { label: 'Average Daily Volume', value: `${Math.round(reportData.grandTotal / reportData.dailySales.length).toLocaleString()} L` }
  ]
  pdf.addSummaryCards(summaryData)

  pdf.save(`daily-sales-liters-${stationName.replace(/\s+/g, '-')}-${monthLabel.replace(/\s+/g, '-')}.pdf`)
}

export const exportDailySalesLitersReportExcel = (reportData: DailySalesLitersData, stationName: string, monthLabel: string) => {
  const excel = new ExcelExporter()

  const totalDays = reportData.dailySales.length || 1
  const totalVolume = reportData.grandTotal || 0
  const avgDaily = Math.round(totalVolume / totalDays)

  // Daily sales data with totals
  const salesData = reportData.dailySales.map((day) => {
    const row: (string | number)[] = [new Date(day.date).toLocaleDateString()]
    reportData.fuelTypes.forEach(fuelName => {
      row.push(day.sales[fuelName] || 0)
    })
    row.push(day.totalLiters)
    return row
  })

  // Add totals row
  const totalsRow: (string | number)[] = ['TOTAL']
  reportData.fuelTypes.forEach(fuelName => {
    const total = reportData.dailySales.reduce((sum, day) => sum + (day.sales[fuelName] || 0), 0)
    totalsRow.push(total)
  })
  totalsRow.push(totalVolume)
  salesData.push(totalsRow)

  const headers = ['Date', ...reportData.fuelTypes, 'Daily Total (L)']
  excel.addWorksheet('Daily Sales', headers, salesData)

  // Fuel type breakdown
  const fuelBreakdown = reportData.fuelTypes.map(fuelName => {
    const total = reportData.dailySales.reduce((sum, day) => sum + (day.sales[fuelName] || 0), 0)
    const percentage = totalVolume > 0 ? ((total / totalVolume) * 100).toFixed(2) : '0.00'
    return [
      fuelName,
      total,
      `${percentage}%`
    ]
  })
  excel.addWorksheet('Fuel Type Breakdown', ['Fuel Type', 'Total Volume (L)', 'Percentage'], fuelBreakdown)

  // Summary
  const summaryData = [
    { label: 'Station', value: stationName },
    { label: 'Reporting Period', value: monthLabel },
    { label: 'Total Days', value: totalDays },
    { label: 'Total Volume (L)', value: totalVolume },
    { label: 'Average Daily Volume (L)', value: avgDaily },
    { label: 'Fuel Types Sold', value: reportData.fuelTypes.length }
  ]
  excel.addSummaryWorksheet('Summary', summaryData)

  excel.save(`daily-sales-liters-${stationName.replace(/\s+/g, '-')}-${monthLabel.replace(/\s+/g, '-')}.xlsx`)
}

// POS Sales Report Export
interface POSSalesReportData {
  summary: {
    totalSales: number
    totalTransactions: number
    totalTerminals: number
    totalBanks: number
  }
  bankBreakdown: Array<{
    bankName: string
    totalAmount: number
    transactionCount: number
  }>
  terminalBreakdown: Array<{
    terminalName: string
    bankName: string
    totalAmount: number
    transactionCount: number
  }>
}

export const exportPOSSalesReportPDF = async (reportData: POSSalesReportData, stationName: string, monthLabel: string, chartImage?: string) => {
  const pdf = new PDFExporter(`POS Sales Report - ${stationName} - ${monthLabel}`, 'landscape')

  const totalSales = reportData.summary.totalSales || 0
  const totalTransactions = reportData.summary.totalTransactions || 1
  const totalTerminals = reportData.summary.totalTerminals || 1
  const avgPerTransaction = Math.round(totalSales / totalTransactions)
  const avgPerTerminal = Math.round(totalSales / totalTerminals)

  // Report Information
  pdf.addSectionTitle('Report Information')
  pdf.addKeyValuePairs([
    { label: 'Reporting Period', value: monthLabel },
    { label: 'Station', value: stationName },
    { label: 'Banks Serviced', value: reportData.summary.totalBanks.toString() },
    { label: 'Active POS Terminals', value: totalTerminals.toString() }
  ], 2)

  pdf.addDivider()

  // Key Performance Metrics
  pdf.addSectionTitle('Key Performance Metrics')
  const statsGrid = [
    [
      { label: 'Total POS Sales', value: `Rs. ${totalSales.toLocaleString()}`, color: 'blue' },
      { label: 'Total Transactions', value: totalTransactions.toString(), color: 'green' },
      { label: 'Avg Per Transaction', value: `Rs. ${avgPerTransaction.toLocaleString()}`, color: 'purple' }
    ],
    [
      { label: 'Active Terminals', value: totalTerminals.toString(), color: 'orange' },
      { label: 'Avg Per Terminal', value: `Rs. ${avgPerTerminal.toLocaleString()}`, color: 'blue' },
      { label: 'Banks Connected', value: reportData.summary.totalBanks.toString(), color: 'green' }
    ]
  ]
  pdf.addStatisticsGrid(statsGrid)

  pdf.addDivider()

  // Sales Trend Chart
  if (chartImage) {
    pdf.addSectionTitle('Daily Sales Trend by Bank')
    pdf.addChart(chartImage, '', 250, 100)
    pdf.addDivider()
  }

  // Bank-wise breakdown
  pdf.addSectionTitle('Sales Analysis by Bank')
  const bankData = reportData.bankBreakdown.map((bank) => {
    const percentage = totalSales > 0 ? ((bank.totalAmount / totalSales) * 100).toFixed(1) : '0.0'
    const avgTrans = bank.transactionCount > 0 ? Math.round(bank.totalAmount / bank.transactionCount) : 0
    return [
      bank.bankName,
      `Rs. ${bank.totalAmount.toLocaleString()}`,
      bank.transactionCount.toString(),
      `${percentage}%`,
      `Rs. ${avgTrans.toLocaleString()}`
    ]
  })

  // Add totals row for banks
  const bankTotalsRow = [
    'TOTAL',
    `Rs. ${totalSales.toLocaleString()}`,
    totalTransactions.toString(),
    '100.0%',
    `Rs. ${avgPerTransaction.toLocaleString()}`
  ]
  bankData.push(bankTotalsRow)

  pdf.addTable(['Bank', 'Total Sales', 'Transactions', 'Market Share', 'Avg/Transaction'], bankData)

  pdf.addDivider()

  // Terminal-wise breakdown
  pdf.addSectionTitle('Sales Analysis by POS Terminal')
  const terminalData = reportData.terminalBreakdown.map((terminal) => {
    const avgTrans = terminal.transactionCount > 0 ? Math.round(terminal.totalAmount / terminal.transactionCount) : 0
    const percentage = totalSales > 0 ? ((terminal.totalAmount / totalSales) * 100).toFixed(1) : '0.0'
    return [
      terminal.terminalName,
      terminal.bankName,
      `Rs. ${terminal.totalAmount.toLocaleString()}`,
      terminal.transactionCount.toString(),
      `${percentage}%`,
      `Rs. ${avgTrans.toLocaleString()}`
    ]
  })

  // Add totals row for terminals
  const terminalTotalsRow = [
    'TOTAL',
    'All Banks',
    `Rs. ${totalSales.toLocaleString()}`,
    totalTransactions.toString(),
    '100.0%',
    `Rs. ${avgPerTransaction.toLocaleString()}`
  ]
  terminalData.push(terminalTotalsRow)

  pdf.addTable(['POS Terminal', 'Bank', 'Total Sales', 'Trans', 'Share', 'Avg/Trans'], terminalData)

  pdf.save(`pos-sales-${stationName.replace(/\s+/g, '-')}-${monthLabel.replace(/\s+/g, '-')}.pdf`)
}

export const exportPOSSalesReportExcel = (reportData: POSSalesReportData, stationName: string, monthLabel: string) => {
  const excel = new ExcelExporter()

  const totalSales = reportData.summary.totalSales || 0
  const totalTransactions = reportData.summary.totalTransactions || 1
  const totalTerminals = reportData.summary.totalTerminals || 1
  const avgPerTransaction = Math.round(totalSales / totalTransactions)
  const avgPerTerminal = Math.round(totalSales / totalTerminals)

  // Bank breakdown with calculations
  const bankData = reportData.bankBreakdown.map((bank) => {
    const percentage = totalSales > 0 ? ((bank.totalAmount / totalSales) * 100).toFixed(2) : '0.00'
    const avgTrans = bank.transactionCount > 0 ? Math.round(bank.totalAmount / bank.transactionCount) : 0
    return [
      bank.bankName,
      bank.totalAmount,
      bank.transactionCount,
      `${percentage}%`,
      avgTrans
    ]
  })

  // Add totals row
  bankData.push([
    'TOTAL',
    totalSales,
    totalTransactions,
    '100.00%',
    avgPerTransaction
  ])

  excel.addWorksheet('Sales by Bank', ['Bank', 'Total Sales (Rs)', 'Transactions', 'Market Share', 'Avg/Trans (Rs)'], bankData)

  // Terminal breakdown with calculations
  const terminalData = reportData.terminalBreakdown.map((terminal) => {
    const avgTrans = terminal.transactionCount > 0 ? Math.round(terminal.totalAmount / terminal.transactionCount) : 0
    const percentage = totalSales > 0 ? ((terminal.totalAmount / totalSales) * 100).toFixed(2) : '0.00'
    return [
      terminal.terminalName,
      terminal.bankName,
      terminal.totalAmount,
      terminal.transactionCount,
      `${percentage}%`,
      avgTrans
    ]
  })

  // Add totals row
  terminalData.push([
    'TOTAL',
    'All Banks',
    totalSales,
    totalTransactions,
    '100.00%',
    avgPerTransaction
  ])

  excel.addWorksheet('Sales by Terminal', ['POS Terminal', 'Bank', 'Total Sales (Rs)', 'Trans', 'Share', 'Avg/Trans (Rs)'], terminalData)

  // Summary with all metrics
  const summaryData = [
    { label: 'Station', value: stationName },
    { label: 'Reporting Period', value: monthLabel },
    { label: 'Total POS Sales (Rs)', value: totalSales },
    { label: 'Total Transactions', value: totalTransactions },
    { label: 'Active Terminals', value: totalTerminals },
    { label: 'Banks Serviced', value: reportData.summary.totalBanks },
    { label: 'Avg Per Transaction (Rs)', value: avgPerTransaction },
    { label: 'Avg Per Terminal (Rs)', value: avgPerTerminal }
  ]
  excel.addSummaryWorksheet('Summary', summaryData)

  excel.save(`pos-sales-${stationName.replace(/\s+/g, '-')}-${monthLabel.replace(/\s+/g, '-')}.xlsx`)
}

// Credit Customer Report Export
interface CreditCustomerReportData {
  summary: {
    totalCustomers: number
    activeCustomers: number
    totalOutstanding: number
    totalCreditSales: number
    totalPayments: number
  }
  customerDetails: Array<{
    name: string
    company: string
    currentBalance: number
    creditLimit: number
    salesInPeriod: number
    paymentsInPeriod: number
    agingCategory: string
  }>
}

export const exportCreditCustomerReportPDF = async (reportData: CreditCustomerReportData, stationName: string, monthLabel: string, chartImage?: string) => {
  const pdf = new PDFExporter(`Credit Customer Report - ${stationName} - ${monthLabel}`, 'landscape')

  const totalCustomers = reportData.summary.totalCustomers || 0
  const activeCustomers = reportData.summary.activeCustomers || 1
  const totalOutstanding = reportData.summary.totalOutstanding || 0
  const totalCreditSales = reportData.summary.totalCreditSales || 0
  const totalPayments = reportData.summary.totalPayments || 0

  const collectionRate = totalCreditSales > 0
    ? ((totalPayments / totalCreditSales) * 100).toFixed(1)
    : '0.0'
  const avgOutstanding = Math.round(totalOutstanding / activeCustomers)
  const avgCreditLimit = reportData.customerDetails.length > 0
    ? Math.round(reportData.customerDetails.reduce((sum, c) => sum + c.creditLimit, 0) / reportData.customerDetails.length)
    : 0
  const netCreditChange = totalCreditSales - totalPayments

  // Report Information
  pdf.addSectionTitle('Report Information')
  pdf.addKeyValuePairs([
    { label: 'Reporting Period', value: monthLabel },
    { label: 'Station', value: stationName },
    { label: 'Total Customers', value: totalCustomers.toString() },
    { label: 'Active Customers', value: activeCustomers.toString() }
  ], 2)

  pdf.addDivider()

  // Key Performance Metrics
  pdf.addSectionTitle('Key Performance Metrics')
  const statsGrid = [
    [
      { label: 'Total Outstanding', value: `Rs. ${totalOutstanding.toLocaleString()}`, color: 'red' },
      { label: 'Credit Sales (Period)', value: `Rs. ${totalCreditSales.toLocaleString()}`, color: 'orange' },
      { label: 'Payments Received', value: `Rs. ${totalPayments.toLocaleString()}`, color: 'green' }
    ],
    [
      { label: 'Collection Rate', value: `${collectionRate}%`, color: 'purple' },
      { label: 'Avg Outstanding', value: `Rs. ${avgOutstanding.toLocaleString()}`, color: 'blue' },
      { label: 'Net Credit Change', value: `Rs. ${netCreditChange.toLocaleString()}`, color: netCreditChange >= 0 ? 'orange' : 'green' }
    ]
  ]
  pdf.addStatisticsGrid(statsGrid)

  pdf.addDivider()

  // Aging Analysis Chart
  if (chartImage) {
    pdf.addSectionTitle('Customer Aging Analysis')
    pdf.addChart(chartImage, '', 250, 100)
    pdf.addDivider()
  }

  // Financial Analysis
  pdf.addSectionTitle('Financial Analysis')
  const financialMetrics = [
    { label: 'Average Credit Limit', value: `Rs. ${avgCreditLimit.toLocaleString()}` },
    { label: 'Average Outstanding per Customer', value: `Rs. ${avgOutstanding.toLocaleString()}` },
    { label: 'Total Credit Extended', value: `Rs. ${(totalOutstanding + totalCreditSales).toLocaleString()}` },
    { label: 'Recovery Rate', value: `${collectionRate}%` }
  ]
  pdf.addKeyValuePairs(financialMetrics, 2)

  pdf.addDivider()

  // Complete Customer Details
  pdf.addSectionTitle('Customer Account Details')
  const customerData = reportData.customerDetails.map((customer) => {
    const utilization = customer.creditLimit > 0
      ? ((customer.currentBalance / customer.creditLimit) * 100).toFixed(0)
      : '0'
    const netActivity = customer.salesInPeriod - customer.paymentsInPeriod
    return [
      customer.name,
      customer.company || 'N/A',
      `Rs. ${customer.currentBalance.toLocaleString()}`,
      `Rs. ${customer.creditLimit.toLocaleString()}`,
      `${utilization}%`,
      `Rs. ${customer.salesInPeriod.toLocaleString()}`,
      `Rs. ${customer.paymentsInPeriod.toLocaleString()}`,
      `Rs. ${netActivity.toLocaleString()}`,
      customer.agingCategory
    ]
  })

  // Add totals row
  const totalsRow = [
    'TOTAL',
    '-',
    `Rs. ${totalOutstanding.toLocaleString()}`,
    '-',
    '-',
    `Rs. ${totalCreditSales.toLocaleString()}`,
    `Rs. ${totalPayments.toLocaleString()}`,
    `Rs. ${netCreditChange.toLocaleString()}`,
    '-'
  ]
  customerData.push(totalsRow)

  pdf.addTable(
    ['Customer', 'Company', 'Balance', 'Limit', 'Util%', 'Sales', 'Payments', 'Net Change', 'Aging'],
    customerData
  )

  pdf.save(`credit-customers-${stationName.replace(/\s+/g, '-')}-${monthLabel.replace(/\s+/g, '-')}.pdf`)
}

export const exportCreditCustomerReportExcel = (reportData: CreditCustomerReportData, stationName: string, monthLabel: string) => {
  const excel = new ExcelExporter()

  const totalOutstanding = reportData.summary.totalOutstanding || 0
  const totalCreditSales = reportData.summary.totalCreditSales || 0
  const totalPayments = reportData.summary.totalPayments || 0
  const collectionRate = totalCreditSales > 0 ? ((totalPayments / totalCreditSales) * 100).toFixed(2) : '0.00'
  const netCreditChange = totalCreditSales - totalPayments

  // Customer details with calculations
  const customerData = reportData.customerDetails.map((customer) => {
    const utilization = customer.creditLimit > 0
      ? `${((customer.currentBalance / customer.creditLimit) * 100).toFixed(1)}%`
      : 'N/A'
    const netActivity = customer.salesInPeriod - customer.paymentsInPeriod
    return [
      customer.name,
      customer.company || 'N/A',
      customer.currentBalance,
      customer.creditLimit,
      utilization,
      customer.salesInPeriod,
      customer.paymentsInPeriod,
      netActivity,
      customer.agingCategory
    ]
  })

  // Add totals row
  customerData.push([
    'TOTAL',
    '-',
    totalOutstanding,
    '-',
    '-',
    totalCreditSales,
    totalPayments,
    netCreditChange,
    '-'
  ])

  excel.addWorksheet('Customer Details', ['Customer', 'Company', 'Balance (Rs)', 'Limit (Rs)', 'Utilization', 'Sales (Rs)', 'Payments (Rs)', 'Net Change (Rs)', 'Aging'], customerData)

  // Summary with all metrics
  const summaryData = [
    { label: 'Station', value: stationName },
    { label: 'Reporting Period', value: monthLabel },
    { label: 'Total Customers', value: reportData.summary.totalCustomers },
    { label: 'Active Customers', value: reportData.summary.activeCustomers },
    { label: 'Total Outstanding (Rs)', value: totalOutstanding },
    { label: 'Total Credit Sales (Rs)', value: totalCreditSales },
    { label: 'Total Payments (Rs)', value: totalPayments },
    { label: 'Collection Rate (%)', value: collectionRate },
    { label: 'Net Credit Change (Rs)', value: netCreditChange }
  ]
  excel.addSummaryWorksheet('Summary', summaryData)

  excel.save(`credit-customers-${stationName.replace(/\s+/g, '-')}-${monthLabel.replace(/\s+/g, '-')}.xlsx`)
}

// Pumper Details Report Export
interface PumperDetailsReportData {
  summary: {
    totalPumpers: number
    totalShifts: number
    totalSales: number
    totalLiters: number
    excellentPerformers?: number
    goodPerformers?: number
    needsImprovement?: number
    criticalPerformers?: number
  }
  pumperDetails: Array<{
    name: string
    employeeId: string
    totalShifts: number
    totalSales: number
    totalLiters: number
    averageSalesPerShift: number
    varianceRate: number
    performanceRating: string
    totalLoanBalance: number
    averageLitersPerShift: number
    activeLoansCount: number
    totalMonthlyRental: number
    advanceLimit: number
  }>
}

export const exportPumperDetailsReportPDF = (reportData: PumperDetailsReportData, stationName: string, monthLabel: string) => {
  const pdf = new PDFExporter(`Pumper Details Report - ${stationName} - ${monthLabel}`, 'landscape')

  // Pumper details
  const pumperData = reportData.pumperDetails.map((pumper) => [
    pumper.name,
    pumper.employeeId,
    pumper.totalShifts.toString(),
    `Rs. ${pumper.totalSales.toLocaleString()}`,
    `${pumper.totalLiters.toLocaleString()} L`,
    `Rs. ${pumper.averageSalesPerShift.toLocaleString()}`,
    `${pumper.varianceRate.toFixed(2)}%`,
    pumper.performanceRating,
    `Rs. ${pumper.totalLoanBalance.toLocaleString()}`
  ])
  pdf.addTable(['Pumper', 'Employee ID', 'Shifts', 'Total Sales', 'Liters', 'Avg/Shift', 'Variance', 'Rating', 'Loans'], pumperData, 'Pumper Performance')

  // Summary
  const summaryData = [
    { label: 'Total Pumpers', value: reportData.summary.totalPumpers.toString() },
    { label: 'Total Shifts', value: reportData.summary.totalShifts.toString() },
    { label: 'Total Sales', value: `Rs. ${reportData.summary.totalSales.toLocaleString()}` },
    { label: 'Total Liters', value: `${reportData.summary.totalLiters.toLocaleString()} L` }
  ]
  pdf.addSummaryCards(summaryData)

  pdf.save(`pumper-details-${stationName.replace(/\s+/g, '-')}-${monthLabel.replace(/\s+/g, '-')}.pdf`)
}

export const exportPumperDetailsReportExcel = (reportData: PumperDetailsReportData, stationName: string, monthLabel: string) => {
  const excel = new ExcelExporter()

  const totalSales = reportData.summary.totalSales || 0
  const totalLiters = reportData.summary.totalLiters || 0
  const totalShifts = reportData.summary.totalShifts || 1
  const avgSalesPerShift = Math.round(totalSales / totalShifts)
  const avgLitersPerShift = Math.round(totalLiters / totalShifts)

  // Pumper details with all metrics
  const pumperData = reportData.pumperDetails.map((pumper) => [
    pumper.name,
    pumper.employeeId,
    pumper.totalShifts,
    pumper.totalSales,
    pumper.totalLiters,
    pumper.averageSalesPerShift,
    pumper.averageLitersPerShift,
    `${pumper.varianceRate}%`,
    pumper.performanceRating,
    pumper.totalLoanBalance,
    pumper.activeLoansCount,
    pumper.totalMonthlyRental,
    pumper.advanceLimit
  ])

  // Add totals row
  pumperData.push([
    'TOTAL',
    '-',
    totalShifts,
    totalSales,
    totalLiters,
    avgSalesPerShift,
    avgLitersPerShift,
    '-',
    '-',
    reportData.pumperDetails.reduce((sum, p) => sum + p.totalLoanBalance, 0),
    reportData.pumperDetails.reduce((sum, p) => sum + p.activeLoansCount, 0),
    reportData.pumperDetails.reduce((sum, p) => sum + p.totalMonthlyRental, 0),
    '-'
  ])

  excel.addWorksheet('Pumper Performance', [
    'Pumper',
    'Employee ID',
    'Shifts',
    'Total Sales (Rs)',
    'Liters',
    'Avg Sales/Shift (Rs)',
    'Avg Liters/Shift',
    'Variance Rate',
    'Performance',
    'Loan Balance (Rs)',
    'Active Loans',
    'Monthly Rental (Rs)',
    'Advance Limit (Rs)'
  ], pumperData)

  // Summary with all metrics
  const summaryData = [
    { label: 'Station', value: stationName },
    { label: 'Reporting Period', value: monthLabel },
    { label: 'Total Pumpers', value: reportData.summary.totalPumpers },
    { label: 'Total Shifts', value: totalShifts },
    { label: 'Total Sales (Rs)', value: totalSales },
    { label: 'Total Liters', value: totalLiters },
    { label: 'Avg Sales per Shift (Rs)', value: avgSalesPerShift },
    { label: 'Avg Liters per Shift', value: avgLitersPerShift },
    { label: 'Excellent Performers', value: reportData.summary.excellentPerformers || 0 },
    { label: 'Good Performers', value: reportData.summary.goodPerformers || 0 },
    { label: 'Needs Improvement', value: reportData.summary.needsImprovement || 0 },
    { label: 'Critical Performers', value: reportData.summary.criticalPerformers || 0 }
  ]
  excel.addSummaryWorksheet('Summary', summaryData)

  excel.save(`pumper-details-${stationName.replace(/\s+/g, '-')}-${monthLabel.replace(/\s+/g, '-')}.xlsx`)
}

// Generic Table Export Utilities

/**
 * Export any table data to PDF
 * @param title Report title
 * @param columns Column definitions (must include 'title' and 'key')
 * @param data Data array
 * @param filename Output filename (without extension)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exportTableToPDF = (title: string, columns: any[], data: any[], filename: string) => {
  const doc = new PDFExporter(title, 'landscape')

  // Format headers
  const headers = columns.map(col => col.title)

  // Format data
  const tableData = data.map(row => {
    return columns.map(col => {
      const value = row[col.key]

      // Handle custom formatting if provided in column definition
      if (col.exportFormatter) {
        return col.exportFormatter(value, row)
      }

      // Default formatting
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No'
      }
      if (value === null || value === undefined) {
        return ''
      }
      if (typeof value === 'object') {
        // Try to handle simple objects or arrays
        try {
          return JSON.stringify(value)
        } catch {
          return '[Object]'
        }
      }
      return String(value)
    })
  })

  doc.addTable(headers, tableData)
  doc.save(filename)
}

/**
 * Export any table data to CSV/Excel
 * @param columns Column definitions (must include 'title' and 'key')
 * @param data Data array
 * @param filename Output filename (without extension)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exportTableToCSV = (columns: any[], data: any[], filename: string) => {
  // Format data for Excel
  const excelData = data.map(row => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rowData: Record<string, any> = {}
    columns.forEach(col => {
      let value = row[col.key]

      // Handle custom formatting if provided in column definition
      if (col.exportFormatter) {
        value = col.exportFormatter(value, row)
      } else if (typeof value === 'boolean') {
        value = value ? 'Yes' : 'No'
      } else if (value === null || value === undefined) {
        value = ''
      } else if (typeof value === 'object') {
        try {
          value = JSON.stringify(value)
        } catch {
          value = '[Object]'
        }
      }

      rowData[col.title] = value
    })
    return rowData
  })

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(excelData)

  // Set column widths based on title length
  const wscols = columns.map(col => ({ wch: Math.max(col.title.length + 5, 15) }))
  ws['!cols'] = wscols

  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Pumper Variance Report Export
// ─────────────────────────────────────────────────────────────────────────────
export interface PumperVarianceExportData {
  pumperId: string
  pumperName: string
  nozzleAssignments: string[]
  totalShifts: number
  shiftsWithVariance: number
  varianceCount: number
  totalVarianceAmount: number
  averageVariancePerShift: number
  maxSingleVariance: number
  varianceRate: number
  performanceRating: string
  consecutiveDaysWithoutVariance: number
  totalDueAmount: number
  lastVarianceDate?: string
}

export const exportPumperVariancePDF = (
  pumpers: PumperVarianceExportData[],
  stationName: string,
  monthLabel: string
) => {
  const pdf = new PDFExporter(`Pumper Variance Report - ${stationName} - ${monthLabel}`, 'landscape')

  const totalVariance = pumpers.reduce((s, p) => s + p.totalVarianceAmount, 0)
  const totalDue = pumpers.reduce((s, p) => s + p.totalDueAmount, 0)
  const excellent = pumpers.filter(p => p.performanceRating === 'EXCELLENT').length
  const critical = pumpers.filter(p => p.performanceRating === 'CRITICAL').length
  const avgRate = pumpers.length > 0
    ? pumpers.reduce((s, p) => s + p.varianceRate, 0) / pumpers.length
    : 0

  // Header info
  pdf.addSectionTitle('Report Information')
  pdf.addKeyValuePairs([
    { label: 'Reporting Period', value: monthLabel },
    { label: 'Station', value: stationName },
    { label: 'Total Pumpers', value: pumpers.length.toString() },
    { label: 'Report Generated', value: new Date().toLocaleString() }
  ], 2)
  pdf.addDivider()

  // KPI summary
  pdf.addSectionTitle('Key Performance Metrics')
  pdf.addStatisticsGrid([[
    { label: 'Total Variance Amount', value: `Rs. ${totalVariance.toLocaleString()}`, color: 'red' },
    { label: 'Total Amount Due', value: `Rs. ${totalDue.toLocaleString()}`, color: 'orange' },
    { label: 'Avg Variance Rate', value: `${avgRate.toFixed(1)}%`, color: 'blue' },
    { label: 'Excellent Pumpers', value: excellent.toString(), color: 'green' },
    { label: 'Critical Pumpers', value: critical.toString(), color: 'red' },
    { label: 'Total Pumpers', value: pumpers.length.toString(), color: 'purple' }
  ]])
  pdf.addDivider()

  // Per-pumper table
  pdf.addSectionTitle('Pumper Performance Breakdown')
  pdf.addTable(
    ['Pumper', 'Nozzles', 'Shifts', 'Variances', 'Total Variance', 'Avg/Shift', 'Rate %', 'Due Amount', 'Rating'],
    pumpers.map(p => [
      p.pumperName,
      p.nozzleAssignments.join(', ') || '—',
      p.totalShifts.toString(),
      p.varianceCount.toString(),
      `Rs. ${p.totalVarianceAmount.toLocaleString()}`,
      `Rs. ${p.averageVariancePerShift.toFixed(0)}`,
      `${p.varianceRate.toFixed(1)}%`,
      `Rs. ${p.totalDueAmount.toLocaleString()}`,
      p.performanceRating.replace('_', ' ')
    ])
  )

  pdf.save(`pumper-variance-${stationName.replace(/\s+/g, '-')}-${monthLabel}.pdf`)
}

export const exportPumperVarianceExcel = (
  pumpers: PumperVarianceExportData[],
  stationName: string,
  monthLabel: string
) => {
  const excelData = pumpers.map(p => ({
    'Pumper Name': p.pumperName,
    'Nozzles': p.nozzleAssignments.join(', '),
    'Total Shifts': p.totalShifts,
    'Shifts With Variance': p.shiftsWithVariance,
    'Variance Count': p.varianceCount,
    'Total Variance (Rs)': p.totalVarianceAmount,
    'Avg Variance / Shift (Rs)': parseFloat(p.averageVariancePerShift.toFixed(2)),
    'Max Single Variance (Rs)': p.maxSingleVariance,
    'Variance Rate (%)': parseFloat(p.varianceRate.toFixed(2)),
    'Total Due Amount (Rs)': p.totalDueAmount,
    'Performance Rating': p.performanceRating.replace(/_/g, ' '),
    'Days Without Variance': p.consecutiveDaysWithoutVariance,
    'Last Variance Date': p.lastVarianceDate || 'N/A',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(excelData)
  ws['!cols'] = [
    { wch: 25 }, { wch: 20 }, { wch: 14 }, { wch: 20 }, { wch: 16 },
    { wch: 22 }, { wch: 24 }, { wch: 24 }, { wch: 18 }, { wch: 22 },
    { wch: 22 }, { wch: 22 }, { wch: 22 }
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Pumper Variance')
  XLSX.writeFile(wb, `pumper-variance-${stationName.replace(/\s+/g, '-')}-${monthLabel}.xlsx`)
}