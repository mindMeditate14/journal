import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/nexusjournal_db';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    logger.info('✅ MongoDB connected successfully');
    
    // Create indexes
    await createIndexes();
    
    return mongoose.connection;
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Journal indexes
    const journalCollection = mongoose.connection.collection('journals');
    await journalCollection.createIndex({ status: 1, publishedAt: -1 });
    await journalCollection.createIndex({ 'authors.name': 1 });
    await journalCollection.createIndex({ doi: 1 }, { unique: true, sparse: true });

    // Manuscript indexes
    const manuscriptCollection = mongoose.connection.collection('manuscripts');
    await manuscriptCollection.createIndex({ owner: 1, projectId: 1, updatedAt: -1 });
    await manuscriptCollection.createIndex({ status: 1 });

    // Evidence indexes
    const evidenceCollection = mongoose.connection.collection('clinicalevidence');
    await evidenceCollection.createIndex({ 'condition.name': 1, 'intervention.name': 1 });
    await evidenceCollection.createIndex({ evidenceLevel: 1 });

    // Reference indexes
    const refCollection = mongoose.connection.collection('references');
    await refCollection.createIndex({ owner: 1, tags: 1 });

    // Paper indexes
    const paperCollection = mongoose.connection.collection('papers');
    await paperCollection.createIndex({ doi: 1 }, { unique: true, sparse: true });
    await paperCollection.createIndex({ 'externalIds.openAlex': 1 });
    await paperCollection.createIndex({ publicationYear: -1, citationsCount: -1 });
    await paperCollection.createIndex({ isOpenAccess: 1, publicationYear: -1 });
    await paperCollection.createIndex({ 'authors.name': 1 });
    await paperCollection.createIndex({ 'journal.name': 1 });
    await paperCollection.createIndex({ normalizedTitle: 1 });
    await paperCollection.createIndex({ referencesOpenAlex: 1 });
    await paperCollection.createIndex(
      { title: 'text', abstract: 'text', keywords: 'text', 'authors.name': 'text' },
      {
        weights: {
          title: 8,
          abstract: 3,
          keywords: 5,
          'authors.name': 2,
        },
        name: 'paper_text_index',
      }
    );

    // Ingest run indexes
    const ingestRunCollection = mongoose.connection.collection('ingestruns');
    await ingestRunCollection.createIndex({ createdAt: -1 });
    await ingestRunCollection.createIndex({ source: 1, createdAt: -1 });
    await ingestRunCollection.createIndex({ requestedBy: 1, createdAt: -1 });

    logger.info('✅ Database indexes created');
  } catch (error) {
    logger.warn('⚠️ Index creation warning:', error.message);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', error);
  }
};

export default mongoose;
