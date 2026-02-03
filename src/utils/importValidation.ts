import { z } from 'zod';

// Maximum lengths based on database constraints
const MAX_STRING_LENGTH = 255;
const MAX_PHONE_LENGTH = 50;
const MAX_LINKEDIN_LENGTH = 500;
const MAX_OBSERVACOES_LENGTH = 1000;

// Valid porte values accepted by the database
const VALID_PORTE_VALUES = ['micro', 'pequena', 'media', 'grande'] as const;

// Email validation regex - more permissive than z.email() for edge cases
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Schema for company import row
export const companyImportRowSchema = z.object({
  empresa: z.string()
    .trim()
    .min(1, 'Nome da empresa é obrigatório')
    .max(MAX_STRING_LENGTH, `Nome da empresa deve ter no máximo ${MAX_STRING_LENGTH} caracteres`),
  contato: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `Nome do contato deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default(''),
  email: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `Email deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default('')
    .transform(val => val.toLowerCase()),
  telefone: z.string()
    .trim()
    .max(MAX_PHONE_LENGTH, `Telefone deve ter no máximo ${MAX_PHONE_LENGTH} caracteres`)
    .optional()
    .default(''),
  porte: z.string()
    .trim()
    .max(MAX_STRING_LENGTH)
    .optional()
    .default(''),
  cidade: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `Cidade deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default(''),
  estado: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `Estado deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default(''),
  segmento: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `Segmento deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default(''),
});

// Schema for contact import row
export const contactImportRowSchema = z.object({
  contato: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `Nome do contato deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default(''),
  empresa: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `Nome da empresa deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default(''),
  cargo: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `Cargo deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default(''),
  email: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `Email deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default('')
    .transform(val => val.toLowerCase()),
  telefone: z.string()
    .trim()
    .max(MAX_PHONE_LENGTH, `Telefone deve ter no máximo ${MAX_PHONE_LENGTH} caracteres`)
    .optional()
    .default(''),
  whatsapp: z.string()
    .trim()
    .max(MAX_PHONE_LENGTH, `WhatsApp deve ter no máximo ${MAX_PHONE_LENGTH} caracteres`)
    .optional()
    .default(''),
  linkedin: z.string()
    .trim()
    .max(MAX_LINKEDIN_LENGTH, `LinkedIn deve ter no máximo ${MAX_LINKEDIN_LENGTH} caracteres`)
    .optional()
    .default(''),
  cnpj: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `CNPJ deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default(''),
  cidade: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `Cidade deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default(''),
  estado: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `Estado deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default(''),
  segmento: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `Segmento deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default(''),
  porte: z.string()
    .trim()
    .max(MAX_STRING_LENGTH, `Porte deve ter no máximo ${MAX_STRING_LENGTH} caracteres`)
    .optional()
    .default(''),
});

export type CompanyImportRow = z.infer<typeof companyImportRowSchema>;
export type ContactImportRow = z.infer<typeof contactImportRowSchema>;

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: string[];
  rowIndex: number;
}

/**
 * Validates an array of raw company import rows
 * Returns validated rows and any validation errors
 */
export function validateCompanyImportRows(
  rawRows: Record<string, unknown>[]
): { validRows: CompanyImportRow[]; errors: ValidationResult<CompanyImportRow>[] } {
  const validRows: CompanyImportRow[] = [];
  const errors: ValidationResult<CompanyImportRow>[] = [];

  rawRows.forEach((row, index) => {
    const result = companyImportRowSchema.safeParse(row);
    
    if (result.success) {
      // Additional validation: empresa must not be empty
      if (result.data.empresa.length > 0) {
        validRows.push(result.data);
      }
    } else {
      errors.push({
        valid: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        rowIndex: index + 1, // 1-indexed for user display
      });
    }
  });

  return { validRows, errors };
}

/**
 * Validates an array of raw contact import rows
 * Returns validated rows and any validation errors
 */
export function validateContactImportRows(
  rawRows: Record<string, unknown>[]
): { validRows: ContactImportRow[]; errors: ValidationResult<ContactImportRow>[] } {
  const validRows: ContactImportRow[] = [];
  const errors: ValidationResult<ContactImportRow>[] = [];

  rawRows.forEach((row, index) => {
    const result = contactImportRowSchema.safeParse(row);
    
    if (result.success) {
      // Additional validation: contato or email must be present
      if (result.data.contato || result.data.email) {
        validRows.push(result.data);
      }
    } else {
      errors.push({
        valid: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        rowIndex: index + 1, // 1-indexed for user display
      });
    }
  });

  return { validRows, errors };
}

/**
 * Normalizes porte value to match database constraints
 */
export function normalizePorte(porte: string): string {
  if (!porte) return '';
  
  const porteMap: Record<string, string> = {
    'micro': 'micro',
    'pequeno': 'pequena',
    'pequena': 'pequena',
    'médio': 'media',
    'medio': 'media',
    'média': 'media',
    'media': 'media',
    'grande': 'grande',
    'enterprise': 'grande',
  };
  
  const normalized = porte.toLowerCase().trim();
  return porteMap[normalized] || '';
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Cleans phone number (removes non-digits)
 */
export function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '').slice(0, 15);
}

/**
 * Cleans and normalizes email
 */
export function cleanEmail(email: string): string {
  if (!email) return '';
  return email.replace(/[,<>]/g, '').trim().toLowerCase();
}

/**
 * Sanitizes text input to prevent potential injection
 * Removes common problematic characters while preserving readability
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  // Remove control characters and null bytes, preserve normal punctuation
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
    .trim();
}
