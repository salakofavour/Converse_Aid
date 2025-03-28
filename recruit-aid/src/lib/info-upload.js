'use server'

import { Pinecone } from '@pinecone-database/pinecone';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";


// Initialize Pinecone client
const pc = new Pinecone({
  apiKey: process.env.NEXT_PINECONE_API_KEY
});

const indexName = process.env.NEXT_PINECONE_INDEX_NAME;

// Function to split input text into chunks
// Function to split input text into chunks
async function breakText(job_details) {
  if (!job_details) {
    throw new Error('job_details is required');
  }

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 200,
    chunkOverlap: 40
  });

  // Create text chunks with proper string concatenation
  const title = `Job title and position is : ${job_details.title || ''}`;
  const location = `The job location is : ${job_details.location || ''}`;
  const job_type = `The job type is : ${job_details.job_type || ''}`;
  const salary = `The salary is : ${job_details.salary_min || ''} - ${job_details.salary_max || ''}`;
  
  // Split longer texts
  const responsibilities = await textSplitter.splitText(`The responsibilities are : ${job_details.responsibilities || ''}`);
  const qualifications = await textSplitter.splitText(`The qualifications are : ${job_details.qualifications || ''}`);

  // Create array of all chunks
  const chunks = [
    title,
    location,
    job_type,
    salary,
    ...responsibilities,
    ...qualifications
  ];

  console.log("Generated chunks:", chunks);
  return chunks;
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
    
    // vectors: vectors,       namespace: job_details.id.toString()
    // Upsert vectors into the index with a namespace
    const namespace = job_details.id.toString();
    await index.namespace(namespace).upsert(vectors);

    return true;
  } catch (error) {
    // console.error('Error in uploadVectors:', error);
    throw new Error(error);
  }
}
