import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
import { createRemoteJWKSet, jwtVerify } from 'jose'

const app = express();
const PORT = process.env.BASE_URL || 5000
app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGO_URI);
export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}
const connectClient = await connectToMongoDB()
const db = connectClient.db("book-nook")
const booksCollection = db.collection("books")
const borrowsCollection = db.collection("borrows")

const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))

const verifyApi = async (req, res, next) => {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).send({ message: "Unauthorized: No token provided" })
    }

    const token = authHeader.split(" ")[1]

    try {
        const { payload } = await jwtVerify(token, JWKS)
        req.user = payload
        next()
    } catch (error) {
        console.error("JWT Error:", error.message)
        return res.status(401).send({ message: "Unauthorized: Invalid or expired token" })
    }
}


app.get('/my-books', verifyApi, async (req, res) => {
    const query = req.query.email ? { userEmail: req.query.email } : {}
    const result = await booksCollection.find(query).toArray()
    res.send(result)
})

app.post('/borrows', verifyApi, async (req, res) => {
    const borrowsData = req.body
    const result = await borrowsCollection.insertOne(borrowsData)
    if (borrowsData.bookId) {
        await booksCollection.updateOne(
            { _id: new ObjectId(borrowsData.bookId) },
            { $inc: { totalCopies: -1 } }
        )
    }
    res.send(result)
})

// ইউজারের ধার করা বইয়ের লিস্ট
app.get('/borrows', verifyApi, async (req, res) => {
    const query = req.query.email ? { userEmail: req.query.email } : {}
    const result = await borrowsCollection.find(query).toArray()
    res.send(result)
})

// ধার করা বই ফেরত দেওয়া
app.delete('/borrows/:id', verifyApi, async (req, res) => {
    const id = req.params.id
    const borrow = await borrowsCollection.findOne({ _id: new ObjectId(id) })

    if (borrow?.bookId) {
        await booksCollection.updateOne(
            { _id: new ObjectId(borrow.bookId) },
            { $inc: { totalCopies: 1 } }
        )
    }

    const result = await borrowsCollection.deleteOne({ _id: new ObjectId(id) })
    res.send(result)
})

// নতুন বই যুক্ত করা (Add Book)
app.post('/books', verifyApi, async (req, res) => {
    const booksData = req.body
    const result = await booksCollection.insertOne(booksData)
    res.send(result)
})

// নিজের যুক্ত করা বই ডিলিট করা
app.delete('/books/:id', verifyApi, async (req, res) => {
    const id = req.params.id
    const result = await booksCollection.deleteOne({ _id: new ObjectId(id) })
    res.send(result)
})

// নিজের যুক্ত করা বইয়ের তথ্য এডিট/আপডেট করা
app.put('/books/:id', verifyApi, async (req, res) => {
    const id = req.params.id
    const updateData = req.body
    const result = await booksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
    )
    res.send(result)
})



// সব বই দেখা (হোমপেজ ও All Books পেজের জন্য সবার জন্য উন্মুক্ত)
app.get('/books', async (req, res) => {
    const result = await booksCollection.find({}).toArray()
    res.send(result)
})

// বইয়ের বিস্তারিত পেজ (লগইন ছাড়াও যে কেউ বই দেখতে পারবে)
app.get('/books/:id', async (req, res) => {
    const id = req.params.id
    const book = await booksCollection.findOne({ _id: new ObjectId(id) })
    res.send(book)
})

app.get('/', (req, res) => {
    res.send("BookNook Server is running!")
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})