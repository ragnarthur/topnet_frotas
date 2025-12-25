import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function parseDecimalInput(value: string): number {
  const cleaned = value.replace(/[^\d.,]/g, '')
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? 0 : parsed
}

export function formatDecimalInput(value: number | string, decimals: number): string {
  const parsed = Number(String(value).replace(',', '.'))
  if (!Number.isFinite(parsed)) {
    return ''
  }
  return parsed.toFixed(decimals).replace('.', ',')
}

export function formatCurrencyInput(value: number | string, decimals: number): string {
  const formatted = formatDecimalInput(value, decimals)
  if (!formatted) {
    return ''
  }
  const [integerPart, fractionPart] = formatted.split(',')
  const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return fractionPart
    ? `R$ ${withThousands},${fractionPart}`
    : `R$ ${withThousands}`
}

export function maskCurrencyInput(value: string, maxDecimals: number): string {
  const cleaned = value.replace(/[^\d.,]/g, '')
  if (!cleaned) {
    return ''
  }

  const commaIndex = cleaned.indexOf(',')
  const dotIndex = cleaned.indexOf('.')
  const separatorIndex = commaIndex >= 0 ? commaIndex : dotIndex
  const hasTrailingSeparator = separatorIndex === cleaned.length - 1

  let integerPart = cleaned
  let fractionPart = ''
  if (separatorIndex >= 0) {
    integerPart = cleaned.slice(0, separatorIndex)
    fractionPart = cleaned.slice(separatorIndex + 1).replace(/[.,]/g, '')
  }

  integerPart = integerPart.replace(/^0+(?=\d)/, '')
  if (integerPart === '' && fractionPart) {
    integerPart = '0'
  }

  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  fractionPart = fractionPart.slice(0, maxDecimals)

  if (hasTrailingSeparator) {
    return `R$ ${formattedInteger || '0'},`
  }
  return fractionPart
    ? `R$ ${formattedInteger},${fractionPart}`
    : `R$ ${formattedInteger}`
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}
