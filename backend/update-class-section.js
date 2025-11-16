// Quick script to update class sections in the database
// Run this from the backend terminal with: node update-class-section.js

import('mongodb').then(async ({ MongoClient }) => {
  // Replace with your actual MongoDB connection string
  const uri = 'mongodb+srv://jamesborromeo3_db_user:styfqE3CYTtf7o6Y@cluster0.gje6jlr.mongodb.net/notetify?retryWrites=true&w=majority&appName=Cluster0';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('notetify');
    const classes = db.collection('classes');
    
    // Update network sec class to have year = "4-1" (or whatever section it should be)
    const result = await classes.updateOne(
      { name: 'network sec' },
      { $set: { year: '4-1', section: '4-1' } }
    );
    
    console.log('Update result:', result);
    
    // Show all classes
    const allClasses = await classes.find({}).toArray();
    console.log('\nAll classes:');
    allClasses.forEach(c => {
      console.log(`- ${c.name}: section="${c.section}", year="${c.year}"`);
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
    process.exit(0);
  }
});
