const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Formats a non-negative integer with Dari digits (137 → ۱۳۷). */
export const faNum = (n: number): string => String(n).replace(/\d/g, (d) => FA_DIGITS[+d]);

/** Parses an integer written with Dari, Arabic or Latin digits. */
export function parseFaInt(input: string): number | null {
  const latin = input.trim().replace(/[۰-۹٠-٩]/g, (c) => {
    const d = FA_DIGITS.indexOf(c);
    return String(d >= 0 ? d : AR_DIGITS.indexOf(c));
  });
  return /^[+-]?\d+$/.test(latin) ? parseInt(latin, 10) : null;
}

const GRADE_NAMES: Record<number, string> = {
  1: "اول", 2: "دوم", 3: "سوم", 4: "چهارم", 5: "پنجم", 6: "ششم",
  7: "هفتم", 8: "هشتم", 9: "نهم", 10: "دهم", 11: "یازدهم", 12: "دوازدهم",
};

/** "صنف دوازدهم" for 12. */
export const gradeNameFa = (grade: number) => `صنف ${GRADE_NAMES[grade] ?? faNum(grade)}`;
