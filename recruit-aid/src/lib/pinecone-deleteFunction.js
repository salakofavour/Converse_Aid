// lib/pinecone-ops.js
import { Pinecone } from '@pinecone-database/pinecone';

export async function deletePineconeNamespaceDirect(namespaceId) {
  const pinecone = new Pinecone({ apiKey: process.env.NEXT_PINECONE_API_KEY });
  const index = pinecone.index(process.env.NEXT_PINECONE_INDEX_NAME);
  try {
    const namespace = index.namespace(namespaceId);
    await namespace.deleteAll();
    return { success: true };
  } catch (error) {
    // Handle idempotency, etc.
    const msg = error.message || '';
    if (
      msg.includes('NamespaceNotFoundError') ||
      msg.includes('404') ||
      msg.includes('namespace does not exist')
    ) {
      return { success: true, message: 'Namespace already deleted or does not exist' };
    }
    throw error;
  }
}