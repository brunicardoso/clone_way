export interface GenBankQualifier {
  key: string
  value: string
}

export interface GenBankFeature {
  type: string
  location: string
  qualifiers: GenBankQualifier[]
  complement: boolean
  join: boolean
}

export interface GenBankRecord {
  locus: string
  definition: string
  accession: string
  version: string
  keywords: string
  source: string
  organism: string
  references: string[]
  comments: string[]
  features: GenBankFeature[]
  sequence: string
  isCircular: boolean
}
