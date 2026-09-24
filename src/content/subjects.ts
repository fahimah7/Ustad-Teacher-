import type { IconName } from "../lib/icons";
import type { Multi } from "../lib/i18n";

export type SubjectKey = "math" | "bio" | "chem" | "phys" | "geo" | "hist" | "eng" | "dari" | "pashto";

export type Subject = {
  key: SubjectKey;
  name: Multi;
  short: Multi;
  bg: string;
  ledge: string;
  fg: string;
  sub: string; // secondary text on the subject colour
  icon: IconName;
  tint: string;
  ink: string;
};

export const SUBJECTS: Record<SubjectKey, Subject> = {
  math: { key: "math", name: { en: "Mathematics", fa: "ریاضی", ps: "ریاضي" }, short: { en: "Math", fa: "ریاضی", ps: "ریاضي" }, bg: "#00827E", ledge: "#005F5B", fg: "#FFFFFF", sub: "#DDF6F3", icon: "math", tint: "#DDF6F3", ink: "#005F5B" },
  bio: { key: "bio", name: { en: "Biology", fa: "بیولوژی", ps: "بیولوژي" }, short: { en: "Biology", fa: "بیولوژی", ps: "بیولوژي" }, bg: "#7BC043", ledge: "#558A26", fg: "#1C1433", sub: "#2E4A12", icon: "leaf", tint: "#E6F4D9", ink: "#2E4A12" },
  chem: { key: "chem", name: { en: "Chemistry", fa: "کیمیا", ps: "کیمیا" }, short: { en: "Chemistry", fa: "کیمیا", ps: "کیمیا" }, bg: "#F46A24", ledge: "#B84A12", fg: "#1C1433", sub: "#5C2508", icon: "flask", tint: "#FDE9DA", ink: "#9A3A0C" },
  phys: { key: "phys", name: { en: "Physics", fa: "فزیک", ps: "فزیک" }, short: { en: "Physics", fa: "فزیک", ps: "فزیک" }, bg: "#7443F0", ledge: "#4F24B8", fg: "#FFFFFF", sub: "#E4DBFF", icon: "magnet", tint: "#EEE7FF", ink: "#4F24B8" },
  geo: { key: "geo", name: { en: "Geography", fa: "جغرافیه", ps: "جغرافیه" }, short: { en: "Geography", fa: "جغرافیه", ps: "جغرافیه" }, bg: "#2F7CF6", ledge: "#1F55AD", fg: "#FFFFFF", sub: "#DCE9FF", icon: "map", tint: "#DCE9FF", ink: "#1F55AD" },
  hist: { key: "hist", name: { en: "History", fa: "تاریخ", ps: "تاریخ" }, short: { en: "History", fa: "تاریخ", ps: "تاریخ" }, bg: "#8A5A3B", ledge: "#5E3C26", fg: "#FFFFFF", sub: "#F1E2D6", icon: "hourglass", tint: "#F1E2D6", ink: "#5E3C26" },
  eng: { key: "eng", name: { en: "English", fa: "انگلیسی", ps: "انګلیسي" }, short: { en: "English", fa: "انگلیسی", ps: "انګلیسي" }, bg: "#D81E57", ledge: "#9A1240", fg: "#FFFFFF", sub: "#FFE3EA", icon: "letters", tint: "#FFE3EA", ink: "#9A1240" },
  dari: { key: "dari", name: { en: "Dari", fa: "دری", ps: "دري" }, short: { en: "Dari", fa: "دری", ps: "دري" }, bg: "#FFB31A", ledge: "#C98300", fg: "#1C1433", sub: "#7A4E00", icon: "pen", tint: "#FFF1CC", ink: "#7A4E00" },
  pashto: { key: "pashto", name: { en: "Pashto", fa: "پښتو", ps: "پښتو" }, short: { en: "Pashto", fa: "پښتو", ps: "پښتو" }, bg: "#1C1433", ledge: "#0A0714", fg: "#FFFFFF", sub: "#BDB6D9", icon: "sprout", tint: "#EEE7FF", ink: "#1C1433" },
};

export const subjectOf = (k: SubjectKey) => SUBJECTS[k];
