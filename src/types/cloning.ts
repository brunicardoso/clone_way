import type { Sequence } from './sequence'

export type CloningMethod =
  | 'restriction-ligation'
  | 'gibson'
  | 'golden-gate'
  | 'site-directed-mutagenesis'

export interface CloningStep {
  id: string
  type: 'digest' | 'pcr' | 'ligate' | 'transform' | 'mutate' | 'dpni'
  description: string
  inputSequences: string[] // sequence IDs
  outputSequence: Sequence // resulting product
  parameters: Record<string, string>
}

export interface CloningPlan {
  id: string
  name: string
  method: CloningMethod
  steps: CloningStep[]
  vector: Sequence
  insert: Sequence
  product: Sequence
}
