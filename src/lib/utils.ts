import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sortClasses<T extends { grade_name: string }>(classes: T[]): T[] {
  const getWeightAndName = (gradeName: string) => {
    const name = gradeName.trim().toLowerCase();
    
    // Check if there is a number in the string (e.g., "1st", "10th", "Class 1", "Grade 2")
    const numMatch = name.match(/(\d+)/);
    if (numMatch) {
      return {
        isNumeric: true,
        num: parseInt(numMatch[1], 10),
        raw: name
      };
    }
    
    // Non-numeric classes get ordered after numeric ones
    // We can define a relative order for common kindergarten / pre-school terms
    let weight = 999;
    if (name.includes("playgroup") || name.includes("play")) {
      weight = 1001;
    } else if (name.includes("nursery")) {
      weight = 1002;
    } else if (name.includes("lkg") || name.includes("lower")) {
      weight = 1003;
    } else if (name.includes("ukg") || name.includes("upper")) {
      weight = 1004;
    } else {
      // Other non-numeric classes
      weight = 1005;
    }
    
    return {
      isNumeric: false,
      num: weight,
      raw: name
    };
  };

  return [...classes].sort((a, b) => {
    const infoA = getWeightAndName(a.grade_name);
    const infoB = getWeightAndName(b.grade_name);

    if (infoA.isNumeric && infoB.isNumeric) {
      return infoA.num - infoB.num;
    }
    if (infoA.isNumeric && !infoB.isNumeric) {
      return -1; // Numeric classes first
    }
    if (!infoA.isNumeric && infoB.isNumeric) {
      return 1; // Numeric classes first
    }
    // Both are non-numeric
    if (infoA.num !== infoB.num) {
      return infoA.num - infoB.num;
    }
    return infoA.raw.localeCompare(infoB.raw);
  });
}

