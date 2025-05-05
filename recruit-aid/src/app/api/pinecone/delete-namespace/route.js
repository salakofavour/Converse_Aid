import { Pinecone } from '@pinecone-database/pinecone';
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

    const pinecone = new Pinecone({
      apiKey: process.env.NEXT_PINECONE_API_KEY
    });

    const index = pinecone.index(process.env.NEXT_PINECONE_INDEX_NAME);
    
    try {
      const namespace = index.namespace(namespaceId)
      await namespace.deleteAll();
      console.log('namespace deleted')
      return NextResponse.json({ success: true });
    } catch (deleteError) {
      // If namespace doesn't exist, consider it a success since the end goal is achieved
      console.log('deleteError in api route', deleteError.message);
      if (deleteError.message?.includes('NamespaceNotFoundError') || deleteError.message?.includes('404') || deleteError.message?.includes('namespace does not exist')) {
        return NextResponse.json({ 
          success: true,
          message: 'Namespace already deleted or does not exist'
        });
      }
      throw deleteError; // handle any other errors
    }

  } catch (error) {
    console.error('Error deleting Pinecone namespace:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete Pinecone namespace',
        details: error.message
      },
      { status: 500 }
    );
  }
} 