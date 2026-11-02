
import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';

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

app.post('/borrows', async (req, res) => {
    const borrowsData = req.body
    const result = await borrowsCollection.insertOne(borrowsData)
    if (borrowsData.bookId) {
        await booksCollection.updateOne(
            { _id: new ObjectId(borrowsData.bookId) },
            { $inc: { totalCopies: -1 } }
        )
    }
    res.send(result)
    console.log("object");
})
app.get('/borrows', async (req, res) => {
    const query = req.query.email ? { userEmail: req.query.email } : {}
    const result = await borrowsCollection.find(query).toArray()
    res.send(result)
})
app.delete('/borrows/:id', async (req, res) => {
    const id = req.params.id

    // ১. ধারের রেকর্ড থেকে bookId খুঁজে বের করা
    const borrow = await borrowsCollection.findOne({ _id: new ObjectId(id) })

    // ২. বইয়ের কপি ১ বাড়িয়ে দেওয়া (+1)
    if (borrow?.bookId) {
        await booksCollection.updateOne(
            { _id: new ObjectId(borrow.bookId) },
            { $inc: { totalCopies: 1 } }
        )
    }

    // ৩. borrows কালেকশন থেকে ডিলিট করা
    const result = await borrowsCollection.deleteOne({ _id: new ObjectId(id) })
    res.send(result)
})

app.post('/books', async (req, res) => {
    const booksData = req.body
    const result = await booksCollection.insertOne(booksData)
    res.send(result)
    console.log("object");
})

app.get('/books', async (req, res) => {
    const result = await booksCollection.find({}).toArray()
    res.send(result)
})
app.get('/books/:id', async (req, res) => {
    const id = req.params.id;

    const book = await booksCollection.findOne({
        _id: new ObjectId(id)
    });

    res.send(book);
});

app.get('/', (req, res) => {
    res.send("Hello world")
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})


