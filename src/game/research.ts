// מקום לתוצרי החקר של התלמידות. מלאו שם, טקסט קצר ומקור, והם יופיעו בכרטיס התחנה.
// דוגמה: lisbon: { student: 'שם התלמידה', text: 'מה גיליתי...', source: 'קישור או שם המקור' }
export type Research = { student: string; text: string; source?: string };
export const research: Record<string, Research | null> = {
  lisbon: null, antwerp: null, venice: null, ferrara: null, istanbul: null, tiberias: null,
};
