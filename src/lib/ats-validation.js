/**
 * ATS (Applicant Tracking System) Format Validation
 * Validasi CV agar compatible dengan ATS parsing
 */

export const validateATSFormat = (cvText) => {
  if (!cvText || typeof cvText !== "string") {
    throw new Error("CV text must be a non-empty string");
  }

  const trimmedText = cvText.trim();

  // 1. Minimum length check
  if (trimmedText.length < 50) {
    throw new Error(
      "CV terlalu pendek. Minimum 50 karakter untuk ATS compatibility",
    );
  }

  // 2. Maximum length check (too long = likely garbage text)
  if (trimmedText.length > 50000) {
    throw new Error(
      "CV terlalu panjang. Maksimum 50000 karakter untuk ATS compatibility",
    );
  }

  // 3. Check for invalid characters (control chars, excessive symbols)
  const invalidChars = trimmedText.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g);
  if (invalidChars && invalidChars.length > 10) {
    throw new Error(
      "CV mengandung karakter invalid. Pastikan CV dalam format text yang benar (bukan scanned/image)",
    );
  }

  // 4. Check for at least some letters/numbers (not just symbols)
  const alphanumericCount = (trimmedText.match(/[a-zA-Z0-9]/g) || []).length;
  if (alphanumericCount < 20) {
    throw new Error(
      "CV harus mengandung informasi text yang meaningful (minimal 20 karakter alfanumerik)",
    );
  }

  // 5. Check readability ratio (too many special chars = bad OCR)
  const specialCharRatio =
    (trimmedText.match(/[^a-zA-Z0-9\s\n\r\t.,;:()-]/g) || []).length /
    trimmedText.length;
  if (specialCharRatio > 0.3) {
    throw new Error(
      "CV mengandung terlalu banyak special characters. Kemungkinan CV adalah scanned/image format. Gunakan text-based PDF atau input manual.",
    );
  }

  // 6. Check if contains some expected CV sections
  const cvKeywords = [
    "pendidikan",
    "education",
    "pengalaman",
    "experience",
    "skill",
    "skills",
    "nama",
    "name",
    "email",
    "phone",
    "kontak",
    "contact",
  ];
  const lowerText = trimmedText.toLowerCase();
  const foundKeywords = cvKeywords.filter((kw) =>
    lowerText.includes(kw),
  ).length;

  if (foundKeywords === 0) {
    throw new Error(
      "CV tidak mengandung section standard (education, experience, skills, contact). Format tidak sesuai ATS.",
    );
  }

  // 7. Check for excessive line breaks (likely OCR issue)
  const newlineCount = (trimmedText.match(/\n/g) || []).length;
  const lineCount = trimmedText.split("\n").length;
  const avgLineLength = trimmedText.length / lineCount;

  // Only reject if average line is suspiciously short (typical OCR = 40-60 chars per line)
  // Normal text has average line length > 60 chars
  if (avgLineLength < 40) {
    throw new Error(
      "CV mengandung terlalu banyak line breaks - kemungkinan OCR result atau scanned image. Gunakan PDF text-based atau input manual.",
    );
  }

  return {
    isValid: true,
    length: trimmedText.length,
    alphanumericCount,
    specialCharRatio,
    foundKeywordSections: foundKeywords,
  };
};

/**
 * Validasi JSON CV format
 */
export const validateCVJsonFormat = (cvData) => {
  // 1. Check if it's an object
  if (typeof cvData !== "object" || cvData === null || Array.isArray(cvData)) {
    throw new Error(
      "CV data harus berupa object JSON, bukan array atau tipe lain",
    );
  }

  // 2. Check required fields
  const requiredFields = ["name"];
  const missingFields = requiredFields.filter((field) => !cvData[field]);

  if (missingFields.length > 0) {
    throw new Error(`CV harus memiliki field: ${missingFields.join(", ")}`);
  }

  // 3. Validate name is string
  if (typeof cvData.name !== "string" || cvData.name.trim().length < 2) {
    throw new Error("Nama harus berupa string minimal 2 karakter");
  }

  // 4. Validate email format if provided
  if (cvData.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cvData.email)) {
      throw new Error("Format email tidak valid");
    }
  }

  // 5. Validate arrays if provided
  if (cvData.education && !Array.isArray(cvData.education)) {
    throw new Error("Education harus berupa array");
  }

  if (cvData.experience && !Array.isArray(cvData.experience)) {
    throw new Error("Experience harus berupa array");
  }

  if (cvData.skills) {
    if (!Array.isArray(cvData.skills) && typeof cvData.skills !== "string") {
      throw new Error("Skills harus berupa array atau string");
    }
  }

  return {
    isValid: true,
    message: "CV JSON format valid",
  };
};
