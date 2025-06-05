PG Vector -> PostgreSQL extension that adds vector similarity search capabilities

Vector storage -> a new data type for storing vectors

HNSW -> In-memory index for vector search
IVFFlat -> inverted file index for vector search
Extension gives us distance functions and operators for vectors.

Embeddings workflow: Your explanation jumps around a bit. Consider this flow: "Data → AI model → Embeddings → Database storage → Similarity queries"

When we query for a similarity we should order by embedding <-> [0.1, 0.2, 0.3]

Emeddings -> converts text, imaged or other data into a numbers that can be used for vector search. A list of numbers that captures the semantic meaning of the data.

Database does not create embeddings, we need to use a model to create them. Embeddings are send to the AI model and then the model returns a list of numbers after processing the data and saves them to the database.

To create embeddings we can use openai model -> text-embedding-3-small

Database is just the storage layer. The magic is outside of the database calling Ai services.