const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const fs = require('fs')

const loadTypescript = require('./load-typescript.cjs')

const {
  FileStorageProvider,
  BLOCKED_EXTENSIONS,
  ALLOWED_EXTENSIONS_MAP,
} = loadTypescript('lib/files/storage-provider.ts')

const {
  DEFAULT_DOCUMENT_CATEGORIES,
  DEFAULT_REQUIREMENT_RULES,
} = loadTypescript('lib/files/category-seed.ts')

const {
  uploadShipmentFile,
  getFilesForBol,
  getFilteredFiles,
  getDigitalShipmentFolder,
  getMissingDocumentChecklist,
  reviewFile,
  releaseFileToClient,
  archiveFile,
  restoreArchivedFile,
  generateWhatsAppDocumentRequestMessage,
  generateShipmentDocumentsZip,
} = loadTypescript('lib/files/shipment-file-service.ts')

const RUN_ID = Date.now()
const TEST_BOL_1 = `BOL-TEST-F01-${RUN_ID}`
const TEST_BOL_2 = `BOL-TEST-F02-${RUN_ID}`

test('Shipment File Center - Storage Provider Security & Validation', () => {
  // 1. Blocked executable extensions
  const exeResult = FileStorageProvider.validateFile('payload.exe', 1024, 'application/x-msdownload')
  assert.equal(exeResult.valid, false)
  assert.match(exeResult.error, /prohibited for security reasons/)

  const batResult = FileStorageProvider.validateFile('script.bat', 256, 'text/plain')
  assert.equal(batResult.valid, false)
  assert.match(batResult.error, /prohibited for security reasons/)

  // 2. Allowed document extensions
  const validPdf = FileStorageProvider.validateFile('packing_list.pdf', 2048, 'application/pdf')
  assert.equal(validPdf.valid, true)
  assert.equal(validPdf.extension, 'pdf')

  const validJpg = FileStorageProvider.validateFile('container_front.jpg', 5000, 'image/jpeg')
  assert.equal(validJpg.valid, true)
  assert.equal(validJpg.extension, 'jpg')

  // 3. Filename sanitization against path traversal
  const safeName = FileStorageProvider.sanitizeFilename('../../etc/passwd.pdf')
  assert.ok(!safeName.includes('..'))
  assert.ok(!safeName.includes('/'))
  assert.ok(!safeName.includes('\\'))
  assert.ok(safeName.endsWith('.pdf'))

  // 4. SHA-256 Checksum computation
  const bufA = Buffer.from('Commercial Invoice 2026')
  const bufB = Buffer.from('Commercial Invoice 2026')
  const bufC = Buffer.from('Different Invoice')
  assert.equal(FileStorageProvider.calculateChecksum(bufA), FileStorageProvider.calculateChecksum(bufB))
  assert.notEqual(FileStorageProvider.calculateChecksum(bufA), FileStorageProvider.calculateChecksum(bufC))
})

test('Shipment File Center - Default Categories and Rules', () => {
  assert.ok(DEFAULT_DOCUMENT_CATEGORIES.length >= 8)
  const codes = DEFAULT_DOCUMENT_CATEGORIES.map(c => c.code)
  assert.ok(codes.includes('SHIPPING'))
  assert.ok(codes.includes('CUSTOMS'))
  assert.ok(codes.includes('COMMERCIAL'))
  assert.ok(codes.includes('CERTIFICATES'))
  assert.ok(codes.includes('TRANSPORT'))
  assert.ok(codes.includes('FINANCIAL'))
  assert.ok(codes.includes('PHOTOS'))
  assert.ok(codes.includes('OTHER'))

  assert.ok(DEFAULT_REQUIREMENT_RULES.length >= 5)
})

let uploadedInvoiceId = ''

test('Shipment File Center - File Upload & Metadata Integrity', async () => {
  const content = Buffer.from(`Sample Commercial Invoice Content ${RUN_ID}`)
  const result = await uploadShipmentFile({
    fileBuffer: content,
    originalFileName: 'commercial_inv_001.pdf',
    bolNumber: TEST_BOL_1,
    documentCategoryCode: 'COMMERCIAL',
    documentType: 'Commercial Invoice',
    companyName: 'Kabul Traders Ltd',
    clientVisible: false,
    clientDownloadable: false,
    uploadedBy: 'test_operator',
  })

  assert.ok(result.file)
  const record = result.file
  uploadedInvoiceId = record.id

  assert.ok(record.id)
  assert.equal(record.bol_number, TEST_BOL_1)
  assert.equal(record.document_category_code, 'COMMERCIAL')
  assert.equal(record.document_type, 'Commercial Invoice')
  assert.equal(record.version, 1)
  assert.equal(record.is_current_version, true)
  assert.equal(record.client_visible, false)
  assert.equal(record.file_size, content.length)
  assert.ok(record.checksum)
  assert.ok(FileStorageProvider.fileExists(record.storage_path))
})

test('Shipment File Center - Duplicate Detection & Warning', async () => {
  const content = Buffer.from(`Sample Commercial Invoice Content ${RUN_ID}`) // Identical content & checksum
  const result = await uploadShipmentFile({
    fileBuffer: content,
    originalFileName: 'commercial_inv_001_copy.pdf',
    bolNumber: TEST_BOL_1,
    documentCategoryCode: 'COMMERCIAL',
    documentType: 'Commercial Invoice',
    uploadedBy: 'test_operator',
  })

  assert.equal(result.isDuplicateWarning, true)
  assert.equal(result.existingDuplicateId, uploadedInvoiceId)
})

test('Shipment File Center - Versioning (V1 -> V2, V1 superseded)', async () => {
  const updatedContent = Buffer.from(`Updated Commercial Invoice with amended values ${RUN_ID}`)
  const result = await uploadShipmentFile({
    fileBuffer: updatedContent,
    originalFileName: 'commercial_inv_v2.pdf',
    bolNumber: TEST_BOL_1,
    documentCategoryCode: 'COMMERCIAL',
    documentType: 'Commercial Invoice',
    replaceFileId: uploadedInvoiceId,
    uploadedBy: 'test_operator',
  })

  assert.equal(result.isNewVersion, true)
  assert.equal(result.file.version, 2)
  assert.equal(result.file.is_current_version, true)

  // Check that V1 is marked SUPERSEDED
  const allBolFiles = await getFilesForBol(TEST_BOL_1, true)
  const v1 = allBolFiles.find(f => f.document_type === 'Commercial Invoice' && f.version === 1)
  assert.ok(v1)
  assert.equal(v1.status, 'SUPERSEDED')
  assert.equal(v1.is_current_version, false)
})

test('Shipment File Center - Missing Document Checklist & Completeness', async () => {
  const checklist = await getMissingDocumentChecklist(TEST_BOL_1)

  assert.ok(checklist.items.length > 0)
  assert.ok(typeof checklist.completeness_percentage === 'number')

  // Commercial Invoice was uploaded, should have file attached
  const invItem = checklist.items.find(i => i.rule?.document_type === 'Commercial Invoice' || i.document_type === 'Commercial Invoice')
  if (invItem) {
    assert.ok(invItem.file)
    assert.ok(invItem.status === 'PENDING_REVIEW' || invItem.status === 'AVAILABLE')
  }

  // Upload Packing List
  const plContent = Buffer.from(`Packing List Contents 500 Cartons ${RUN_ID}`)
  await uploadShipmentFile({
    fileBuffer: plContent,
    originalFileName: 'packing_list.pdf',
    bolNumber: TEST_BOL_1,
    documentCategoryCode: 'COMMERCIAL',
    documentType: 'Packing List',
    uploadedBy: 'test_operator',
  })

  const updatedChecklist = await getMissingDocumentChecklist(TEST_BOL_1)
  const plAfter = updatedChecklist.items.find(i => i.rule?.document_type === 'Packing List' || i.document_type === 'Packing List')
  if (plAfter) {
    assert.ok(plAfter.file)
    assert.ok(plAfter.status === 'PENDING_REVIEW' || plAfter.status === 'AVAILABLE')
  }
})

test('Shipment File Center - Review & Release Workflow', async () => {
  const plFiles = (await getFilesForBol(TEST_BOL_1)).filter(f => f.document_type === 'Packing List')
  assert.ok(plFiles.length > 0)
  const fileId = plFiles[0].id

  // 1. Review and approve using 'ACCEPT'
  const reviewed = await reviewFile(fileId, 'ACCEPT', { notes: 'Matches declaration' }, 'finance_manager')
  assert.equal(reviewed.status, 'APPROVED')
  assert.ok(reviewed.audit_history.some(a => a.event === 'APPROVED'))

  // 2. Release to client portal
  const released = await releaseFileToClient(fileId, 'finance_manager')
  assert.equal(released.client_visible, true)
  assert.equal(released.client_downloadable, true)
  assert.ok(released.audit_history.some(a => a.event === 'RELEASED_TO_CLIENT'))
})

test('Shipment File Center - Client Portal Security & Isolation', async () => {
  // Upload internal file with clientVisible = false
  const internalAudit = Buffer.from(`Internal Margin Sheet ${RUN_ID}`)
  await uploadShipmentFile({
    fileBuffer: internalAudit,
    originalFileName: 'margin_sheet.pdf',
    bolNumber: TEST_BOL_1,
    documentCategoryCode: 'FINANCIAL',
    documentType: 'CUSTOMER_INVOICE',
    companyName: 'Kabul Traders Ltd',
    clientVisible: false,
    uploadedBy: 'accountant',
  })

  // Customer A queries files via filtered query with clientVisible = true
  const customerAFiles = await getFilteredFiles({
    bolNumber: TEST_BOL_1,
    clientVisible: true,
  })

  // Customer A must not see internal margin sheet (which has clientVisible = false)
  const costSheet = customerAFiles.files.find(f => f.original_file_name === 'margin_sheet.pdf')
  assert.equal(costSheet, undefined)

  // Cross-customer security: Querying non-existent company
  const crossCustomerFiles = await getFilteredFiles({
    bolNumber: TEST_BOL_2,
    companyName: 'NON_EXISTENT_COMPANY_9999',
  })
  assert.equal(crossCustomerFiles.files.length, 0)
})

test('Shipment File Center - Soft Archive vs Active Folder', async () => {
  const plFiles = (await getFilesForBol(TEST_BOL_1)).filter(f => f.document_type === 'Packing List')
  assert.ok(plFiles.length > 0)
  const fileId = plFiles[0].id

  // Archive
  const archived = await archiveFile(fileId, 'Amended by Shipper', 'operator')
  assert.equal(archived.status, 'ARCHIVED')

  // Active files must exclude it
  const activeFiles = await getFilesForBol(TEST_BOL_1, false)
  assert.equal(activeFiles.some(f => f.id === fileId), false)

  // Including archived must return it
  const allFiles = await getFilesForBol(TEST_BOL_1, true)
  assert.equal(allFiles.some(f => f.id === fileId), true)

  // Restore it
  const restored = await restoreArchivedFile(fileId, 'operator')
  assert.equal(restored.status, 'APPROVED')
})

test('Shipment File Center - Categorized ZIP Generation with manifest.json', async () => {
  const result = await generateShipmentDocumentsZip(TEST_BOL_1, {
    scope: 'all',
  })

  assert.ok(result)
  assert.ok(Buffer.isBuffer(result.zipBuffer))
  assert.ok(result.zipBuffer.length > 100)
  assert.ok(result.fileCount >= 1)

  // Verify ZIP contains entries
  const AdmZip = require('adm-zip')
  const zip = new AdmZip(result.zipBuffer)
  const zipEntries = zip.getEntries()
  assert.ok(zipEntries.length > 0)

  const hasManifest = zipEntries.some(e => e.entryName === 'manifest.json')
  assert.ok(hasManifest, 'ZIP package must contain manifest.json')

  const manifestEntry = zipEntries.find(e => e.entryName === 'manifest.json')
  const manifestData = JSON.parse(manifestEntry.getData().toString('utf8'))
  assert.equal(manifestData.bolNumber, TEST_BOL_1)
  assert.ok(manifestData.totalFiles >= 1)
})

test('Shipment File Center - WhatsApp Document Request Generation', () => {
  // Pashto
  const psMessage = generateWhatsAppDocumentRequestMessage({
    bolNumber: TEST_BOL_1,
    contactName: 'Ahmad Jan',
    missingTypes: ['First Leg B/L', 'Certificate of Origin'],
    language: 'ps',
  })

  assert.ok(psMessage.includes(TEST_BOL_1))
  assert.ok(psMessage.includes('Ahmad Jan'))
  assert.ok(psMessage.includes('First Leg B/L'))
  assert.ok(psMessage.includes('Certificate of Origin'))

  // English
  const enMessage = generateWhatsAppDocumentRequestMessage({
    bolNumber: TEST_BOL_1,
    contactName: 'Ahmad Jan',
    missingTypes: ['Phytosanitary Certificate'],
    language: 'en',
  })

  assert.ok(enMessage.includes('REQUIRED DOCUMENTS NOTICE'))
  assert.ok(enMessage.includes('Phytosanitary Certificate'))
})
