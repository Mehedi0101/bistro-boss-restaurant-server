const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || "5000";

// middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gxsfvvy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// custom middlewares
const verifyToken = (req, res, next) => {
    if (!req?.headers?.authorization) {
        res.status(401).send({ message: 'unauthorized' });
    }
    const token = req?.headers?.authorization?.split(' ')?.[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized' });
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const userCollection = client.db("bistroBoss").collection("users");
        const menuCollection = client.db("bistroBoss").collection("menu");
        const reviewCollection = client.db("bistroBoss").collection("reviews");
        const orderCollection = client.db("bistroBoss").collection("orders");

        const verifyAdmin = async (req, res, next) => {
            const email = req?.decoded?.email;
            const query = {
                email: email
            }
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin' ? true : false;

            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden' })
            }

            next();
        }

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send(token);
        })

        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            if (req?.params?.email !== req?.decoded?.email) {
                res.status(403).send({ message: 'forbidden' });
            }
            const query = { email: req.params.email }
            const user = await userCollection.findOne(query);
            const admin = user?.role === 'admin' ? true : false;
            res.send({ admin });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = {
                email: user.email
            }
            const alreadyExist = await userCollection.findOne(query);
            if (alreadyExist) {
                res.send({ insertedId: true })
            }
            else {
                const result = await userCollection.insertOne(user);
                res.send(result);
            }
        })

        app.patch('/users/admin/:id', verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedUser = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedUser);
            res.send(result);
        })

        app.delete('/users/:id', verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result);
        })

        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const recipe = req.body;
            const result = await menuCollection.insertOne(recipe);
            res.send(result);
        })

        app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await menuCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            const result = await orderCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Bistro Boss Restauran't Server is Running");
})

app.listen(port, () => {
    console.log(`Bistro Boss Restaurant's Server is running on ${port}`);
})