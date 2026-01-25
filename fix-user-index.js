import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixUserIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('restaurantusers');

    // List existing indexes
    const indexes = await collection.listIndexes().toArray();
    console.log('Existing indexes:', indexes.map(idx => idx.name));

    // Drop the existing unique index on email
    try {
      await collection.dropIndex('email_1');
      console.log('Dropped existing email_1 index');
    } catch (error) {
      console.log('Index email_1 not found or already dropped');
    }

    // Check if compound index already exists
    const compoundIndexExists = indexes.some(idx => 
      idx.name === 'email_1_restaurantId_1' || 
      idx.name === 'email_restaurantId_unique'
    );

    if (compoundIndexExists) {
      console.log('Compound index already exists');
    } else {
      // Create compound unique index for email + restaurantId
      await collection.createIndex(
        { email: 1, restaurantId: 1 }, 
        { unique: true, name: 'email_restaurantId_unique' }
      );
      console.log('Created compound unique index: email_restaurantId_unique');
    }

    console.log('Index fix completed successfully!');
    console.log('You can now create users with the same email in different restaurants.');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing index:', error);
    process.exit(1);
  }
};

fixUserIndex();