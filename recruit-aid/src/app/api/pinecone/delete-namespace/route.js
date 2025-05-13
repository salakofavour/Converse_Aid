import { deletePineconeNamespaceDirect } from '@/lib/pinecone-ops';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('Api being hit')
    const { namespaceId } = await request.json();

    if (!namespaceId) {
      return NextResponse.json(
        { error: 'Namespace ID is required' },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!process.env.NEXT_PINECONE_API_KEY || !process.env.NEXT_PINECONE_INDEX_NAME) {
      throw new Error('Missing required Pinecone environment variables');
    }

    const result = await deletePineconeNamespaceDirect(namespaceId);
    console.log('result', result);
    return NextResponse.json(result);

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to delete Pinecone namespace',
        details: error.message
      },
      { status: 500 }
    );
  }
} 