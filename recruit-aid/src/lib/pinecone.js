const BASE_URL = process.env.PUBLIC_APP_URL || 'http://localhost:3000';

export async function deletePineconeNamespace(namespaceId) {
  try {
    console.log('url', `${BASE_URL}/api/pinecone/delete-namespace`);
    const response = await fetch(`${BASE_URL}/api/pinecone/delete-namespace`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ namespaceId }),
    });

    if (!response.ok) {
      console.log('error response', response);
      const error = await response.json();

      throw new Error(error.message || 'Failed to delete Pinecone namespace');
    }
    console.log('pass response', response);
    return await response.json();
  } catch (error) {
    console.error('Error deleting Pinecone namespace:', error);
    throw error;
  }
} 