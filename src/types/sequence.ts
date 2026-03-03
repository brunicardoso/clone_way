export type FeatureType =
  | 'CDS'
  | 'promoter'
  | 'terminator'
  | 'gene'
  | 'rep_origin'
  | 'misc_feature'
  | 'primer_bind'
  | 'regulatory'
  | 'protein_bind'
  | 'exon'
  | 'intron'
  | 'mRNA'
  | "5'UTR"
  | "3'UTR"
  | 'sig_peptide'
  | 'mat_peptide'
  | 'misc_RNA'
  | 'ncRNA'
  | 'rRNA'
  | 'tRNA'

export interface Annotation {
  key: string
  value: string
}

export interface Feature {
  id: string
  name: string
  type: FeatureType
  start: number
  end: number
  strand: 1 | -1
  color?: string
  annotations: Annotation[]
}

export interface RestrictionSite {
  enzyme: string
  position: number
  cutOffset: number
  recognitionSequence: string
  overhang: 'blunt' | '5prime' | '3prime'
}

export interface ORF {
  id: string
  start: number
  end: number
  strand: 1 | -1
  frame: 0 | 1 | 2
}

export interface LibraryFeature {
  id: string
  name: string
  type: FeatureType
  sequence: string
  color?: string
  notes: string
  createdAt: string
}

export interface Sequence {
  id: string
  name: string
  description: string
  bases: string
  isCircular: boolean
  length: number
  features: Feature[]
  restrictionSites: RestrictionSite[]
  orfs: ORF[]
  annotations: Annotation[]
  createdAt: string
  updatedAt: string
}
