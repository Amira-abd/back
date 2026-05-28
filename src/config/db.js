// const config = require('./index')
//  const mongoose = require('mongoose')
// const connectDB = async ()=> {
// try{
//  await mongoose.connect(config.db.uri)
//     console.log('✅ MongoDB connected')
// }
// catch(err){
//     console.error('❌ MongoDB connection failed:', err.message)

//     process.exit(1)

// }
// }

// module.exports = connectDB

import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`connect to database    : ${conn.connection.host} 🎉`);
  } catch (error) {
    console.error(`   fail to connect: ${error.message}`);
    process.exit(1); 
  }
};

export default connectDB;