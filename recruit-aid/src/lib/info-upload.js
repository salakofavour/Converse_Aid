'use server'

import { Pinecone } from '@pinecone-database/pinecone';

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
  // Aim for roughly 200 words per cluster (assuming average 15 words per sentence)
  const estimatedClusters = Math.ceil(sentences.length / 13);
  // Keep clusters between 2 and 8
  return Math.max(2, Math.min(8, estimatedClusters));
}

// Function to split input text into semantic chunks
async function breakText(job_details) {
  if (!job_details) {
    throw new Error('job_details is required');
  }

  // Combine and normalize text
  const combinedText = normalizeWhitespace(`
    ${job_details.about || ''} 
    ${job_details.more_details || ''}
  `);

  // Split into sentences (simple split by period for now)
  const sentences = combinedText.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Get embeddings for sentences using the inference API
  const embeddings = await pc.inference.embed(
    "multilingual-e5-large",
    sentences,
    {
      input_type: "passage",
      truncate: "END"
    }
  );

  // Determine number of clusters dynamically
  const k = getDynamicClusterCount(sentences);

  // Perform k-means clustering
  const points = embeddings.data.map(e => e.values);
  const clusters = await kmeans(points, k);

  // Group sentences by cluster
  const semanticChunks = new Array(k).fill('').map(() => []);
  clusters.forEach((cluster, idx) => {
    semanticChunks[cluster].push(sentences[idx]);
  });

  // Join sentences in each cluster
  const chunks = semanticChunks
    .map(cluster => cluster.join('. '))
    .filter(chunk => chunk.length > 0);

  console.log("Generated semantic chunks:", chunks);
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

    // Split text into chunks
    const docSplits = await breakText(job_details);

    // Create data array with IDs and text
    const data = docSplits.map((text, i) => ({
      id: i.toString(),
      text: text
    }));


    // Get embeddings using the inference API
    try{
      const model = "multilingual-e5-large";
      const input = data.map(d => d.text);

    var embeddings = await pc.inference.embed(
      model,
      input,
      {
        input_type: "passage", truncuate:"END"
      }
    );
    console.log("embeddings", embeddings);
  } catch (error) {
    console.error('Error in creating embeddings:', error);
    throw error;
  }

    // Create vectors for upserting
    const vectors = data.map((d, i) => ({
      id: d.id,
      values: embeddings.data[i].values,
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
    // console.error('Error in uploadVectors:', error);
    throw new Error(error);
  }
}
