export interface BolAutomationSettings {
  autoCreateBolForNewShipment: boolean
  autoCreateDraftBolForNewContainer: boolean
  autoCreateBolDuringImport: boolean
  bolPrefix: string
  sequenceFormat: string
  defaultBolStatus: string
  requireConsignee: boolean
  requireShipper: boolean
  requireDestination: boolean
  duplicateDetection: boolean
}

export const DEFAULT_BOL_AUTOMATION_SETTINGS: BolAutomationSettings = {
  autoCreateBolForNewShipment: true,
  autoCreateDraftBolForNewContainer: true,
  autoCreateBolDuringImport: true,
  bolPrefix: "SKY-BOL",
  sequenceFormat: "YYYY-NNNNNN",
  defaultBolStatus: "DRAFT",
  requireConsignee: false,
  requireShipper: false,
  requireDestination: false,
  duplicateDetection: true
}

export interface BolMatchResult {
  matched: boolean
  reason: string
  confidence: number
  bolId?: string
}

export interface BolImportBatchResult {
  entriesFound: number
  existingBolsMatched: number
  newBolsCreated: number
  draftBolsCreated: number
  containersLinked: number
  shippersLinked: number
  consigneesLinked: number
  invoicesLinked: number
  ledgerTransactionsLinked: number
  possibleDuplicates: number
  missingRequiredFields: number
  errors: number
}
