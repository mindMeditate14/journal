import mongoose from 'mongoose';
import Manuscript from './src/models/Manuscript.js';

const id = '69f950f7db330707713b1fb7';

mongoose.connect('mongodb://localhost:27017/nexusjournal_db')
  .then(async () => {
    const ms = await Manuscript.findById(id).populate('journalId');
    
    if (!ms) {
      console.log('NOT FOUND');
      process.exit(1);
    }
    
    console.log(JSON.stringify({
      _id: ms._id,
      title: ms.title,
      status: ms.status,
      body: ms.body ? `${ms.body.substring(0, 100)}...` : 'MISSING',
      abstract: ms.abstract ? ms.abstract.substring(0, 100) : 'MISSING',
      authors: ms.authors,
      discipline: ms.discipline,
      finalDocument: ms.finalDocument,
      submittedBy: ms.submittedBy,
    }, null, 2));
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
