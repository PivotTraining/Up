export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.flat().filter(Boolean).join(' ')
}

export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(2)}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const CATEGORIES = [
  { value: 'faith', label: 'Faith' },
  { value: 'academic', label: 'Academic' },
  { value: 'training', label: 'Training' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'health', label: 'Health' },
] as const

export const CATEGORY_COLORS: Record<string, string> = {
  faith: 'bg-purple-100 text-purple-800',
  academic: 'bg-blue-100 text-blue-800',
  training: 'bg-orange-100 text-orange-800',
  leadership: 'bg-green-100 text-green-800',
  health: 'bg-red-100 text-red-800',
}
