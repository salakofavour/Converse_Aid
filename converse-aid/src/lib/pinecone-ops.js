'use server'

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

// Initialize Pinecone client
const pc = new Pinecone({
  apiKey: process.env.NEXT_PINECONE_API_KEY
});

const indexName = process.env.NEXT_PINECONE_INDEX_NAME;

// Function to normalize whitespace in text
function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

// Function to split input text into semantic chunks
async function breakText(content) {
  if (!content) {
    throw new Error('content is required');
  }

  const text = normalizeWhitespace(`${content || ''}`);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  if (!sentences.length) {
    throw new Error('No valid sentences found in input text.');
  }

  // Get embeddings for sentences
  const embeddings = await pc.inference.embed(
    "multilingual-e5-large",
    sentences,
    {
      input_type: "passage",
      truncate: "END"
    }
  );

  // Return individual sentence chunks with their vectors
  return embeddings.data.map((embedding, index) => ({
    text: sentences[index],
    values: embedding.values
  }));
}


// Function to create pinecone index, connect to it, and upload input chunks as vectors
export async function uploadVectors(job_details) {
  try {
    console.log('job_details', job_details);
    // First, try to delete the existing namespace
    try {
      await deletePineconeNamespaceDirect(job_details.id.toString());
    } catch (deleteError) {
      console.error('Error deleting Pinecone namespace:', deleteError);
      throw new Error('Upload was unsuccessful, try again');
    }

    // Check if index exists, if not create it
    const indexList = await pc.listIndexes();
    const indexes = indexList["indexes"]
    console.log("indexes", indexes);
    
    // Check if the index exists by looking for an index with matching name
    const indexExists = indexes.some(index => index.name === indexName);
    
    if (!indexExists) {
      await pc.createIndex({
        name: indexName,
        dimension: 1024,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      console.log('Index created successfully');
    } else {
      console.log('Index already exists');
    }

    // Connect to the index
    const index = pc.index(indexName);

    // assign embedded chuncks to variable (breakText already splits texts, embeds them into vectors, group similar vectors & returns the chunks)
    const data = await breakText(job_details.content_to_upload);
    

    // Create vectors for upserting
    const vectors = data.map((d, i) => ({
      id: i.toString(),
      values: d.values,
      metadata: { text: d.text }
    }));

    if (!Array.isArray(vectors)) {
      throw new Error('vectors must be an array');
    }
    
    // Upsert vectors into the index with a namespace
    const namespace = job_details.id.toString();
    await index.namespace(namespace).upsert(vectors);

    return true;
  } catch (error) {
    console.error('Error in uploadVectors:', error);
    throw error;
  }
}

