/**
 * Format số tiền sang định dạng tiền tệ Việt Nam Đồng (VND) hoặc ngoại tệ
 */
export function formatCurrency(amount: number, currency: string = 'VND'): string {
  if (isNaN(amount)) return '0 ₫';
  
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Format ngày giờ sang định dạng tiếng Việt
 */
export function formatDate(dateString: string | Date, includeTime: boolean = false): string {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) return '';

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  };

  return new Intl.DateTimeFormat('vi-VN', options).format(date);
}

/**
 * Rút gọn chuỗi dài
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
