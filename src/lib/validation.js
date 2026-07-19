/**
 * Validate material form data
 * @param {Object} formData - Material data to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateMaterial = (formData) => {
  const errors = [];

  // Title validation
  if (!formData.title || formData.title.trim().length === 0) {
    errors.push("Title is required");
  } else if (formData.title.trim().length > 200) {
    errors.push("Title must be less than 200 characters");
  } else if (/<[^>]*>/g.test(formData.title)) {
    errors.push("HTML tags not allowed in title");
  }

  // Subject validation
  if (!formData.subjectId || formData.subjectId.trim().length === 0) {
    errors.push("Subject is required");
  }

  // Type validation
  const validTypes = ["Notes", "Practicals", "PYQ", "Assignment"];
  if (!validTypes.includes(formData.type)) {
    errors.push("Invalid material type");
  }

  // Semester validation
  if (!formData.semester) {
    errors.push("Semester is required");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateFile = (file) => {
  const errors = [];
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];

  if (!file) {
    errors.push("File is required");
    return { isValid: false, errors };
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size must be less than 500MB (got ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  }

  if (file.size === 0) {
    errors.push("File is empty");
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push(`File type not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize filename
 * @param {string} filename - Original filename
 * @returns {string} Safe filename
 */
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
