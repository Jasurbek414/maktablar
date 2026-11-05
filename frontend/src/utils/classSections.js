// Maktab sinf harflari (bo'limlari / literasi) — Lotin, O'zbek maxsus va Kirill alifbolari to'liq
export const LATIN_SECTIONS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

export const UZBEK_EXTRA_SECTIONS = [
  "O'", "G'", "Oʻ", "Gʻ", "Sh", "Ch"
];

export const CYRILLIC_SECTIONS = [
  'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К', 'Л', 'М',
  'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Э', 'Ю', 'Я'
];

export const ALL_SECTIONS = [
  ...LATIN_SECTIONS,
  ...UZBEK_EXTRA_SECTIONS,
  ...CYRILLIC_SECTIONS
];
