import { importFile } from '@/services/file/importer'
import type { Sequence } from '@/types'

interface AddgeneResponse {
  name: string
  genbank: string
  format: 'genbank' | 'fasta'
  addgeneId: string
}

interface AddgeneError {
  error: string
}

export async function fetchFromAddgene(plasmidId: string): Promise<Sequence> {
  const res = await fetch(`/api/addgene?id=${encodeURIComponent(plasmidId)}`)
  const data: AddgeneResponse | AddgeneError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error(
      'error' in data ? data.error : `Addgene request failed (${res.status})`,
    )
  }

  const ext = data.format === 'genbank' ? 'gbk' : 'fasta'
  const sequence = importFile(`${data.name}.${ext}`, data.genbank)
  // Use the plasmid name from Addgene page, not the GenBank LOCUS line
  sequence.name = data.name || `Addgene #${data.addgeneId}`
  return sequence
}
