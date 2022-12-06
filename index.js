const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
// middleware

// mongo db
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ibovumw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
// verifying jwt token start
// function verifyJWT(req,res,next){
//   const authHeader = req.headers.authorization;
//   if(!authHeader){
//     res.status(401).send({message : 'unauthorized access!'})
//   }
//   const token = authHeader.split(' ')[1];
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
//     if(err){
//       res.status(401).send({message: 'unauthorized access'})
//     }
//     req.decoded = decoded;
//     next()
//   })

// }
function verifyJWT(req, res, next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: "unauthorized access"})
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(403).send({message: "unauthorized access"})
    }
    req.decoded = decoded;
    next()
  })
}

// verifying jwt token end
async function run() {
  try {
    const serviceCollection = client.db("geniusCar").collection("services");
    const orderCollection = client.db("geniusCar").collection("order");
    // JWT Token
    app.post('/jwt', async( req, res ) => {
      const user = req.body;
      // create a token
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'})
      // send this token to the user
      res.send({token})
    })
    // jwt
    // get all data from database
    app.get("/services", async (req, res) => {
      // search implementation
      const searchItem = req.query.search;
      let query = {};
      if(searchItem.length){
        query = {
          $text:{
            $search: searchItem
          }
        }
      }
      // const query = {price : {$eq: 100, $lt:300}}
      // const query = {price : {$eq:200}}
      // const query = {price: {$gte:100}}
      // const query = { price: { $in: [100, 20 ] } }
      // const query = {price: {$ne:100}}
      // const cursor = serviceCollection.find(query).sort({price: order});
      // const services = await cursor.toArray();
      // const query = {$and: [{price: {$gt: 20}}, {price: {$gt: 100}}]}
      const order = req.query.order === 'asc' ? 1 : -1
      const cursor = serviceCollection.find(query).sort({price: order});
      const services = await cursor.toArray();
      res.send(services);
    });
    // get all data from database end
    // get a single data from database
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await serviceCollection.findOne(query);
      res.send(service);
    });
    // order collection
    // get user specified order data
    app.get("/orders", verifyJWT, async (req, res) => {
      // console.log(req.headers.authorization);
      const decoded = req.decoded;
      console.log(decoded);
      if(decoded.email !== req.query.email){
        return res.status(403).send({message: 'Unauthorized access!!'})
      }
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });
    // post an order
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });
    // update dat through patch
    app.patch("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const query = {_id: ObjectId(id)}
      const updatedDoc = {
        $set:{
          status: status
        }
      }
      const result = await orderCollection.updateOne(query, updatedDoc)
      res.send(result)
    });

    // delete order from order section
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}

run().catch((err) => console.log(err));
// mongo end

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
