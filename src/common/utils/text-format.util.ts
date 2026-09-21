export function capitalizeWords(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      if (/^[A-Z]{2,3}$/.test(word) || /\d/.test(word)) return word;
      const lower = word.toLocaleLowerCase();
      return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
    })
    .join(' ');
}
