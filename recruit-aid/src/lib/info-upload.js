import { Pinecone } from '@pinecone-database/pinecone';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";


// Initialize Pinecone client
const pc = new Pinecone({
  apiKey: process.env.NEXT_PINECONE_API_KEY
});

const indexName = process.env.NEXT_PINECONE_INDEX_NAME;

// Function to split input text into chunks
async function breakText(text) {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 200,
    chunkOverlap: 40
  });

  // Split the text into chunks
  const chunks = await textSplitter.splitText(text);
  return chunks;
}

// Function to create pinecone index, connect to it, and upload input chunks as vectors
async function uploadVectors(text) {
  try {
    // Check if index exists, if not create it
    const indexList = await pc.listIndexes();
    
    if (!indexList.includes(indexName)) {
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
    const docSplits = await breakText(text);

    // Create data array with IDs and text
    const data = docSplits.map((text, i) => ({
      id: i.toString(),
      text: text
    }));

    // Get embeddings using the inference API
    const embeddings = await pc.embeddings.embed({
      model: "multilingual-e5-large",
      input: data.map(d => d.text),
      type: "passage"
    });

    // Create vectors for upserting
    const vectors = data.map((d, i) => ({
      id: d.id,
      values: embeddings[i].values,
      metadata: { text: d.text }
    }));

    // Upsert vectors into the index with a namespace
    await index.upsert({
      vectors: vectors,
      namespace: "f97535bd-7939-4dfc-bfd4-a063c38bd95d"
    });

    console.log(`Check id: ${data[0].id}`);
    return true;
  } catch (error) {
    console.error('Error in uploadVectors:', error);
    throw error;
  }
}

// Export the function
export { uploadVectors };
