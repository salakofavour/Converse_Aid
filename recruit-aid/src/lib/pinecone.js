export async function deletePineconeNamespace(namespaceId) {
  try {
    const response = await fetch('/api/pinecone/delete-namespace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ namespaceId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete Pinecone namespace');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting Pinecone namespace:', error);
    throw error;
  }
} 