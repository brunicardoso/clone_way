import { importFile } from '@/services/file/importer'
import type { Sequence } from '@/types'

interface NCBIResponse {
  name: string
  genbank: string
  format: 'genbank'
  accessionId: string
}

interface NCBIError {
  error: string
}

export async function fetchFromNCBI(accessionId: string): Promise<Sequence> {
  const res = await fetch(`/api/ncbi?id=${encodeURIComponent(accessionId)}`)
  const data: NCBIResponse | NCBIError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error(
      'error' in data ? data.error : `NCBI request failed (${res.status})`,
    )
  }

  const sequence = importFile(`${data.name}.gbk`, data.genbank)
  sequence.name = data.name || accessionId
  return sequence
}
