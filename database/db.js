// Force Google DNS to resolve MongoDB Atlas SRV records
// (Some ISPs/networks don't support SRV records properly)

import dns from 'dns'

dns.setServers([
  '8.8.8.8',
  '8.8.4.4',
])

import mongoose from 'mongoose'
const connectDB = async () => {

    try{
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log(`MongoDB connected: ${conn.connection.host}`)
    }catch(error){
        console.log(`MongoDB Connection Error: ${error}`)
    }
}

export default connectDB