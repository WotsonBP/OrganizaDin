/**
 * Módulo de validação e sanitização de inputs
 * Protege contra SQL Injection, XSS e outros ataques de entrada
 */

/**
 * Sanitiza strings removendo caracteres perigosos
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove caracteres de controle e normaliza
  let sanitized = input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
    .trim()
    .slice(0, maxLength); // Limita tamanho

  // Remove padrões suspeitos de SQL injection
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /(--|;|\*|'|"|`)/g,
    /(\/\*|\*\/)/g,
  ];

  for (const pattern of sqlPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized;
}

/**
 * Valida e sanitiza valores numéricos
 */
export function sanitizeNumber(value: string | number, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number | null {
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      return null;
    }
    return Math.max(min, Math.min(max, value));
  }

  if (typeof value !== 'string') {
    return null;
  }

  // Remove caracteres não numéricos exceto ponto e vírgula
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);

  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  return Math.max(min, Math.min(max, num));
}

/**
 * Valida formato de data ISO
 */
export function validateDate(dateStr: string): boolean {
  if (typeof dateStr !== 'string') {
    return false;
  }

  // Formato esperado: YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return false;
  }

  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr === date.toISOString().split('T')[0];
}

/**
 * Valida e sanitiza IDs de banco de dados
 */
export function sanitizeId(id: string | number | null | undefined): number | null {
  if (id === null || id === undefined) {
    return null;
  }

  const numId = typeof id === 'string' ? parseInt(id, 10) : id;

  if (isNaN(numId) || !isFinite(numId) || numId < 1 || numId > Number.MAX_SAFE_INTEGER) {
    return null;
  }

  return Math.floor(numId);
}

/**
 * Valida senha de 4 dígitos
 */
export function validatePin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Valida descrição de transação
 */
export function validateDescription(description: string): boolean {
  if (typeof description !== 'string') {
    return false;
  }

  const sanitized = sanitizeString(description, 200);
  return sanitized.length >= 1 && sanitized.length <= 200;
}

/**
 * Valida nome de categoria/cartão/porquinho
 */
export function validateName(name: string, maxLength: number = 50): boolean {
  if (typeof name !== 'string') {
    return false;
  }

  const sanitized = sanitizeString(name, maxLength);
  return sanitized.length >= 1 && sanitized.length <= maxLength;
}

/**
 * Valida valores monetários
 */
export function validateAmount(amount: string | number, min: number = 0.01, max: number = 999999999.99): boolean {
  const sanitized = sanitizeNumber(amount, min, max);
  return sanitized !== null && sanitized >= min && sanitized <= max;
}

/**
 * Sanitiza array de parâmetros SQL
 */
export function sanitizeSqlParams(params: (string | number | null)[]): (string | number | null)[] {
  return params.map((param) => {
    if (param === null || param === undefined) {
      return null;
    }

    if (typeof param === 'number') {
      return sanitizeNumber(param) ?? null;
    }

    if (typeof param === 'string') {
      // Para IDs, tenta converter para número
      const numId = parseInt(param, 10);
      if (!isNaN(numId) && numId.toString() === param) {
        return sanitizeId(numId);
      }
      // Caso contrário, sanitiza como string
      return sanitizeString(param);
    }

    return null;
  });
}
