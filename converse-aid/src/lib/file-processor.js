import mammoth from "mammoth";


const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB in bytes
const ALLOWED_TYPES = {

  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt'
};

export function validateFile(file) {
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size must be less than 15MB' };
  }

  // Check file type
  const fileType = getFileType(file);
  if (!fileType) {
    return { 
      isValid: false, 
      error: 'Invalid file type. Only DOC, DOCX, and TXT files are allowed' 
    };
  }

  return { isValid: true, error: null };
}

export async function extractTextFromFile(file) {
  try {
    console.log('file type', file.type);
    const fileType = getFileType(file);

    switch (fileType) {

      case 'doc':
      case 'docx':
        const docArrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: docArrayBuffer });
        return { content: result.value, error: null };

      case 'txt':
        const text = await file.text();
        return { content: text, error: null };

      default:
        return { 
          content: null, 
          error: 'Unsupported file type' 
        };
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    return { 
      content: null, 
      error: 'File content could not be extracted. Please try again with a different file.' 
    };
  }
}

export async function dataURLToFileContent(dataUrl, fileName = 'file') {
  try {
    // Parse the DataURL
    const [meta, base64] = dataUrl.split(',');
    const mimeMatch = meta.match(/data:(.*?);base64/);
    if (!mimeMatch) {
      return { content: null, error: 'Invalid data URL format' };
    }
    const mime = mimeMatch[1];
    // Decode base64 to binary
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    // Create a File or Blob
    const file = new File([array], fileName, { type: mime });
    // Use extractTextFromFile to get the content
    return await extractTextFromFile(file);
  } catch (error) {
    console.error('Error extracting text from data URL:', error);
    return {
      content: null,
      error: 'Failed to extract text from data URL',
    };
  }
}

function getFileType(file) {
  if (file.type && ALLOWED_TYPES[file.type]) {
    return ALLOWED_TYPES[file.type];
  }
  // Fallback: check extension
  const ext = file.name.split('.').pop().toLowerCase();
  switch (ext) {
    case 'doc': return 'doc';
    case 'docx': return 'docx';
    case 'txt': return 'txt';
    default: return undefined;
  }
}