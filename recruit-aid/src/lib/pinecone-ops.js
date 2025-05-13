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

// Function to determine number of clusters based on text length
function getDynamicClusterCount(sentences) {
  // Aim for roughly 200 words per cluster (assuming average 15 words per sentence) & 6 sentences per cluster
  const estimatedClusters = Math.ceil(sentences.length / 6);
  // Keep clusters between 2 and 15
  return Math.max(2, Math.min(15, estimatedClusters));
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

  const k = getDynamicClusterCount(sentences);
  const points = embeddings.data.map(e => e.values);
  const clusters = await kmeans(points, k);

  // Group sentences and their embeddings by cluster
  const semanticChunks = new Array(k).fill(null).map(() => []);
  const semanticVectors = new Array(k).fill(null).map(() => []);

  clusters.forEach((cluster, idx) => {
    semanticChunks[cluster].push(sentences[idx]);
    semanticVectors[cluster].push(points[idx]);
  });

  // For each chunk, join sentences and average their vectors
  const chunks = semanticChunks
    .map((cluster, i) => {
      if (cluster.length === 0) return null;
      // Average the vectors for this chunk
      const vectors = semanticVectors[i];
      const avgVector = vectors[0].map((_, dim) =>
        vectors.reduce((sum, vec) => sum + vec[dim], 0) / vectors.length
      );
      return {
        text: cluster.join('. '),
        values: avgVector
      };
    })
    .filter(Boolean);

  return chunks;
}

// Simple k-means implementation
async function kmeans(points, k, maxIterations = 10) {
  const dimensions = points[0].length;
  
  // Initialize centroids randomly
  let centroids = Array(k).fill().map(() => 
    Array(dimensions).fill().map(() => Math.random())
  );
  
  let labels = new Array(points.length);
  let iterations = 0;
  let oldLabels;

  do {
    oldLabels = [...labels];
    
    // Assign points to nearest centroid
    labels = points.map(point => {
      const distances = centroids.map(centroid => 
        euclideanDistance(point, centroid)
      );
      return distances.indexOf(Math.min(...distances));
    });
    
    // Update centroids
    for (let i = 0; i < k; i++) {
      const clusterPoints = points.filter((_, idx) => labels[idx] === i);
      if (clusterPoints.length > 0) {
        centroids[i] = clusterPoints.reduce((acc, point) => 
          acc.map((val, idx) => val + point[idx])
        ).map(sum => sum / clusterPoints.length);
      }
    }
    
    iterations++;
  } while (iterations < maxIterations && !arraysEqual(labels, oldLabels));

  return labels;
}

function euclideanDistance(a, b) {
  return Math.sqrt(
    a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
  );
}

function arraysEqual(a, b) {
  return a.length === b.length && 
    a.every((val, idx) => val === b[idx]);
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

