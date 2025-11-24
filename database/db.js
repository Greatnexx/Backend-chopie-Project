import mongoose from 'mongoose'

const connectDB = async () => {
    try{
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4
        })
        console.log(`MongoDB connected: ${conn.connection.host}`)
    }catch(error){
        console.log(`Error: ${error.message}`)
        console.log('unable to connect')
        process.exit(1)
    }
}

export default connectDB