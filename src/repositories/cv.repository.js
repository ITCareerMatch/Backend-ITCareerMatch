// Dummy implementation, replace with real DB queries
export async function uploadToSupabase(file) {
  // Simulate upload, return dummy URL
  return `https://supabase.storage/cv/${file.originalname}`;
}

export async function saveCvArchiveToDb({
  userId,
  fileUrl,
  fileName,
  rawText,
  status,
}) {
  // Simulate DB insert, return object with id
  return {
    id: Math.random().toString(36).substring(2, 15),
    userId,
    fileUrl,
    fileName,
    rawText,
    status,
  };
}

export async function getCvArchiveById(id) {
  // Simulate DB fetch
  return null;
}
