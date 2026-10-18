export type ProductGrade = string

export type DryFruitVariant = {
  name: string
  grades: ProductGrade[]
  hsCode: string
  defaultUnit: string
  suggestedPackageTypes: string[]
}

export type DryFruitCatalogEntry = {
  id: string
  category: string
  productName: string
  varieties: DryFruitVariant[]
}

export type DryFruitSearchResult = {
  entry: DryFruitCatalogEntry
  variety: DryFruitVariant
  gradeLabel: string
}

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const gradeLibraries: Record<string, string[]> = {
  Figs: ['Premium', 'Extra Fancy', 'Fancy', 'Choice', 'Standard', 'Grade A', 'Grade B', 'Grade C', 'Organic', 'Conventional'],
  Raisins: ['Premium', 'Extra', 'Choice', 'Standard', 'Grade A', 'Grade B', 'Organic', 'Conventional', 'Seedless', 'Seeded'],
  Dates: ['Premium', 'Jumbo', 'Extra Large', 'Large', 'Medium', 'Small', 'Choice', 'Standard', 'Organic', 'Conventional'],
  Almonds: ['Premium', 'Extra Fancy', 'Fancy', 'Choice', 'Standard', 'Whole', 'Halves', 'Pieces', 'Organic', 'Conventional'],
  Pistachios: ['Premium', 'Super Premium', 'Extra', 'Choice', 'Standard', 'Jumbo', 'Large', 'Medium', 'Organic', 'Conventional'],
  Walnuts: ['Premium', 'Extra Light', 'Light', 'Choice', 'Standard', 'Whole', 'Halves', 'Quarters', 'Pieces', 'Organic', 'Conventional'],
  Cashews: ['Premium', 'Choice', 'Standard', 'Whole', 'Pieces', 'Roasted', 'Salted', 'Organic', 'Conventional'],
  Hazelnuts: ['Premium', 'Extra Fancy', 'Fancy', 'Choice', 'Standard', 'Whole', 'Pieces', 'Organic', 'Conventional'],
  Peanuts: ['Premium', 'Extra Large', 'Large', 'Medium', 'Small', 'Choice', 'Standard', 'Organic', 'Conventional'],
  'Other Nuts': ['Premium', 'Super Premium', 'Extra Fancy', 'Fancy', 'Choice', 'Standard', 'Organic', 'Conventional'],
  'Other Dried Products': ['Premium', 'Super Premium', 'Extra Fancy', 'Fancy', 'Choice', 'Standard', 'Organic', 'Conventional'],
}

const packageLibraries: Record<string, string[]> = {
  Figs: ['Carton', 'Box', 'Bag', 'Jute Bag', 'Bulk'],
  Raisins: ['Carton', 'Bag', 'Vacuum Bag', 'Plastic Bag', 'Bulk'],
  Dates: ['Carton', 'Box', 'Bag', 'Vacuum Bag', 'Bulk'],
  Almonds: ['Carton', 'Bag', 'Vacuum Bag', 'Jute Bag', 'Bulk'],
  Pistachios: ['Carton', 'Bag', 'Vacuum Bag', 'Tin', 'Bulk'],
  Walnuts: ['Carton', 'Bag', 'Vacuum Bag', 'Jute Bag', 'Bulk'],
  Cashews: ['Carton', 'Bag', 'Vacuum Bag', 'Tin', 'Bulk'],
  Hazelnuts: ['Carton', 'Bag', 'Vacuum Bag', 'Tin', 'Bulk'],
  Peanuts: ['Carton', 'Bag', 'Sack', 'Jute Bag', 'Bulk'],
  'Other Nuts': ['Carton', 'Bag', 'Box', 'Bulk'],
  'Other Dried Products': ['Carton', 'Bag', 'Vacuum Bag', 'Box', 'Bulk'],
}

const hsCodes: Record<string, string> = {
  Figs: '0804.20.10',
  Raisins: '0806.20.00',
  Dates: '0804.10.00',
  Almonds: '0802.11.00',
  Pistachios: '0802.51.00',
  Walnuts: '0802.31.00',
  Cashews: '0801.31.00',
  Hazelnuts: '0802.21.00',
  Peanuts: '1202.41.00',
  'Other Nuts': '0802.90.00',
  'Other Dried Products': '0813.40.00',
}

const gradeOverrides: Record<string, string[]> = {
  'Afghan Dry Figs': ['Premium', 'Grade A', 'Grade B', 'Grade C', 'Organic', 'Conventional'],
  'Iranian Dry Figs': ['Premium', 'Grade A', 'Grade B', 'Standard', 'Organic', 'Conventional'],
  'Malayer Raisins': ['Premium', 'Extra', 'Choice', 'Standard', 'Seedless', 'Seeded'],
  'Kashmari Raisins': ['Premium', 'Extra', 'Choice', 'Standard', 'Seedless'],
  'Piarom Dates': ['Premium', 'Jumbo', 'Extra Large', 'Large', 'Organic', 'Conventional'],
  'Ajwa Dates': ['Premium', 'Jumbo', 'Large', 'Medium', 'Organic', 'Conventional'],
  'Mamra Almonds': ['Super Premium', 'Premium', 'Extra', 'Choice', 'Whole', 'Organic'],
  'Nonpareil Almonds': ['Super Premium', 'Premium', 'Extra Fancy', 'Fancy', 'Whole', 'Organic'],
  'Akbari Pistachios': ['Super Premium', 'Premium', 'Jumbo', 'Large', 'Choice', 'Conventional'],
  'Ahmad Aghaei Pistachios': ['Super Premium', 'Premium', 'Jumbo', 'Large', 'Choice', 'Conventional'],
  'W180': ['W180', 'Premium', 'Whole', 'Standard'],
  'W210': ['W210', 'Premium', 'Whole', 'Standard'],
  'W240': ['W240', 'Premium', 'Whole', 'Standard'],
  'W320': ['W320', 'Premium', 'Whole', 'Standard'],
  'W450': ['W450', 'Premium', 'Whole', 'Standard'],
  'SW240': ['SW240', 'Premium', 'Split', 'Pieces', 'Standard'],
  'SW320': ['SW320', 'Premium', 'Split', 'Pieces', 'Standard'],
  'Extra Light Walnut Kernels': ['Extra Light', 'Premium', 'Choice', 'Organic'],
  'Light Walnut Kernels': ['Light', 'Premium', 'Choice', 'Organic'],
}

const productGroups: Record<string, string[]> = {
  Figs: ['Dry Figs', 'Black Mission Figs', 'Calimyrna Figs', 'Turkish Figs', 'Afghan Dry Figs', 'Iranian Dry Figs', 'Natural Dry Figs', 'Pressed Dry Figs'],
  Raisins: ['Green Raisins', 'Golden Raisins', 'Sultana Raisins', 'Thompson Raisins', 'Black Raisins', 'Red Raisins', 'Brown Raisins', 'Seedless Raisins', 'Seeded Raisins', 'Malayer Raisins', 'Kashmari Raisins', 'Sun-Dried Raisins'],
  Dates: ['Medjool Dates', 'Deglet Noor Dates', 'Mazafati Dates', 'Zahedi Dates', 'Kabkab Dates', 'Sayer Dates', 'Piarom Dates', 'Barhi Dates', 'Ajwa Dates', 'Khudri Dates', 'Safawi Dates', 'Sukari Dates', 'Rabbi Dates', 'Dayri Dates', 'Halawi Dates'],
  Almonds: ['Almonds in Shell', 'Shelled Almonds', 'Blanched Almonds', 'Sliced Almonds', 'Slivered Almonds', 'Roasted Almonds', 'Mamra Almonds', 'California Almonds', 'Nonpareil Almonds', 'Carmel Almonds', 'Sonora Almonds', 'Gurbandi Almonds'],
  Pistachios: ['Pistachios in Shell', 'Shelled Pistachios', 'Green Pistachio Kernels', 'Roasted Pistachios', 'Salted Pistachios', 'Akbari Pistachios', 'Ahmad Aghaei Pistachios', 'Fandoghi Pistachios', 'Kalleh Ghouchi Pistachios', 'Badghis Pistachios'],
  Walnuts: ['Walnuts in Shell', 'Shelled Walnuts', 'Walnut Halves', 'Walnut Quarters', 'Walnut Pieces', 'Light Walnut Kernels', 'Extra Light Walnut Kernels', 'Chandler Walnuts', 'Afghan Walnuts'],
  Cashews: ['Raw Cashews', 'Roasted Cashews', 'Salted Cashews', 'Whole Cashews', 'Split Cashews', 'Cashew Pieces', 'W180', 'W210', 'W240', 'W320', 'W450', 'SW240', 'SW320'],
  Hazelnuts: ['Hazelnuts in Shell', 'Shelled Hazelnuts', 'Blanched Hazelnuts', 'Roasted Hazelnuts', 'Whole Hazelnuts', 'Chopped Hazelnuts'],
  Peanuts: ['Peanuts in Shell', 'Shelled Peanuts', 'Blanched Peanuts', 'Roasted Peanuts', 'Salted Peanuts', 'Red-Skin Peanuts', 'Virginia Peanuts', 'Runner Peanuts'],
  'Other Nuts': ['Brazil Nuts', 'Macadamia Nuts', 'Pine Nuts', 'Pecans', 'Chestnuts'],
  'Other Dried Products': ['Dried Apricots', 'Dried Prunes', 'Dried Peaches', 'Dried Pears', 'Dried Apples', 'Dried Cherries', 'Dried Cranberries', 'Dried Blueberries', 'Dried Mulberries', 'Dried Barberries', 'Dried Mango', 'Dried Pineapple', 'Dried Banana', 'Dried Coconut', 'Dried Kiwi', 'Dried Papaya', 'Dried Orange', 'Dried Lemon', 'Dried Lime', 'Dried Pomegranate Arils'],
}

const makeEntry = (category: string, productName: string): DryFruitCatalogEntry => ({
  id: slugify(`${category}-${productName}`),
  category,
  productName,
  varieties: [{
    name: productName,
    grades: gradeOverrides[productName] || gradeLibraries[category],
    hsCode: hsCodes[category],
    defaultUnit: 'KG',
    suggestedPackageTypes: packageLibraries[category],
  }],
})

export const DRY_FRUIT_CATALOG: DryFruitCatalogEntry[] = Object.entries(productGroups)
  .flatMap(([category, products]) => products.map(productName => makeEntry(category, productName)))

export const QUANTITY_UNITS = ['PCS', 'CTN', 'BAG', 'BOX', 'SACK', 'PALLET', 'DRUM', 'BALE', 'PACKAGE', 'CASE', 'BULK'] as const
export const WEIGHT_UNITS = ['KG', 'MT', 'G', 'LB', 'TON'] as const
export const PACKAGE_TYPES = ['Carton', 'Box', 'Bag', 'Sack', 'Vacuum Bag', 'Plastic Bag', 'Jute Bag', 'Wooden Case', 'Tin', 'Drum', 'Pallet', 'Bulk', 'Custom'] as const
export const PRICE_BASES = ['Per KG', 'Per MT', 'Per LB', 'Per Piece', 'Per Carton', 'Per Bag', 'Per Package'] as const

export const findDryFruitEntry = (id?: string | null) => DRY_FRUIT_CATALOG.find(entry => entry.id === id)

export const searchDryFruitCatalog = (query: string, limit = 10): DryFruitSearchResult[] => {
  const normalized = query.trim().toLowerCase()
  const results: DryFruitSearchResult[] = []
  for (const entry of DRY_FRUIT_CATALOG) {
    for (const variety of entry.varieties) {
      const searchable = [entry.productName, variety.name, variety.grades.join(' '), variety.hsCode, entry.category].join(' ').toLowerCase()
      if (!normalized || searchable.includes(normalized)) {
        results.push({ entry, variety, gradeLabel: variety.grades.slice(0, 5).join(' · ') })
      }
      if (results.length >= limit) return results
    }
  }
  return results
}
