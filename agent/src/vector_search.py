import os
import json
from typing import Dict, Any, List, Optional
from pinecone import Pinecone
from src.utils import retry_with_backoff
from src.database import db
import src.config as config

class VectorSearchService:
    """
    Handles vector search operations using Pinecone.
    
    This class provides methods for embedding queries and searching for
    relevant information in the vector database.
    """
    
    def __init__(self):
        """Initialize the vector search service."""
        self.client = None
        self.connect()
    
    def connect(self) -> None:
        """
        Connect to the Pinecone service.
        
        Raises:
            ConnectionError: If unable to connect to Pinecone
        """
        try:
            # Ensure we have necessary environment variables
            if not os.environ.get("PINECONE_API_KEY"):
                raise ValueError("Missing Pinecone API key in environment variables")
                
            self.client = Pinecone(api_Key=os.environ.get("PINECONE_API_KEY"))
        except Exception as e:
            raise ConnectionError(f"Could not connect to Pinecone: {str(e)}")
    
    @retry_with_backoff()
    def embed_text(self, text: str) -> List[float]:
        """
        Embed a text string using Pinecone's embedding service.
        
        Args:
            text: Text to embed
            
        return:
            Embedding vector
            
        Raises:
            ConnectionError: If embedding fails
        """
        try:
            embedding_response = self.client.inference.embed(
                model="multilingual-e5-large",
                inputs=[text],
                parameters={"input_type": "query"}
            )
            
            # Extract the embedding values
            embedding = embedding_response[0]['values']
            
            return embedding
        except Exception as e:
            raise
    
    @retry_with_backoff()
    def search(self, index_name: str, vector: List[float], 
              namespace: str, top_k: int = 5, 
              score_threshold: float = 0.8) -> Dict[str, Any]:
        """
        Search for similar vectors in Pinecone.
        
        Args:
            index_name: Name of the Pinecone index
            vector: Embedding vector to search with
            namespace: Namespace within the index
            top_k: Number of results to return
            score_threshold: Minimum similarity score for filtering
            
        return:
            Dict with search results and context
            
        Raises:
            ConnectionError: If search fails
        """
        try:
            
            index = self.client.Index(index_name)

            
            results = index.query(
                namespace=namespace,
                vector=vector,
                top_k=top_k,
                include_values=False,
                include_metadata=True,
            )
            # Process the results to extract context
            context = ""
            for match in results.matches:
                if match.score >= score_threshold:
                    context += match.metadata["text"] + "\n\n"
            
            if not context:
                context = None
            
            return {
                "raw_results": results.matches,
                "context": context,
                "has_relevant_matches": bool(context)
            }
        except Exception as e:
            print(f"Error in search: {e}")
            raise
    
    def search_with_text(self, job_id: str, text: str, index_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Search Pinecone using a text string.
        
        Args:
            job_id: Job ID
            text: Text to search for
            index_name: Name of the index to search (defaults to one in env)
            
        return:
            Dict with search results and context
            
        Raises:
            Various exceptions based on operations
        """
        try:
            # Use default index if none provided (note index name is like db name, namespace is like tables(in a sense))
            if not index_name:
                index_name = os.environ.get("INDEX_NAME")
                
            # Embed the text
            embedding = self.embed_text(text)
            # print("got here in search_with_text, embedding", embedding)
            #namespace is the job id, definitely not default one
            job_details = db.get_job_details(job_id)
            namespace = job_details.get('id', "") #no default namespace for now. I will add a universal default one later.
            # Search using the embedding
            # print("got here in search_with_text, namespace", namespace)
            search_results = self.search(index_name, embedding, namespace)
            
            return search_results
        except Exception as e:
            return {"error": str(e), "context": "", "has_relevant_matches": False}

# Create a singleton instance
vector_search = VectorSearchService() 