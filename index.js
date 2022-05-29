const express = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;
const app = express()


//middleware
app.use(cors())
//body diye jei data pai sheita access korar jnno aita use kora hocchey
app.use(express.json())


//connect to mongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.yz2oh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
  try {
    //connect to client
    await client.connect();
    const productCollection=client.db('menufacturar').collection('products');
    const orderCollection=client.db('menufacturar').collection('orders');
    const userCollection=client.db('menufacturar').collection('users');

    //posting products to DB
    app.post('/addproduct',async (req,res)=>{
      const result=await productCollection.insertOne(req.body);
      res.send(result)
    })  //end of post ')

    
    //getting all products from database
    app.get('/products',async(req,res)=>{
      const products=await productCollection.find({}).toArray();
      res.send(products);
    })

    app.get('/product/:id',async(req,res)=>{
      const product=await productCollection.findOne({_id:ObjectId(req.params.id)});
      res.send(product);
    })

    //to take order data from client and store it to DB
    app.post('/order',async(req,res)=>{
      const order=req.body
      const result=await orderCollection.insertOne(order);
      res.send({
        success: true,
        result:result,
      });
    })

    //get order data from DB for each user basis on his email to showcase each user orders in his dashboard
    app.get('/order',async(req,res)=>{
      const user_email=req.query.email;
      const query={email:user_email}
      //finding data
      const result=await orderCollection.find(query).toArray();
      res.send(result);
    })

    //user add if user not added yet in Db or update user(PUT method)
    app.put('/user/:email',async(req,res)=>{
      const user_email=req.params.email;  //client side thekey url hit ar smy dynamic bhabey url ar sathey thaka email
      const query={email:user_email}
      const user=req.body;                //client side thekey pathano data jeita DB tey store korbo query ar opor base korey
      const result=await userCollection.updateOne(query,{$set:user},{upsert:true});
      res.send(result);
    })

    app.delete('/product',async(req,res)=>{

    })

  } finally {

  }
}
run().catch(console.dir)

//root url=>'/'
app.get('/', (req, res) => {
    res.send('Running doctor portal Server Perfectly Yessss!');
  });
  
  //MEWAO LIFE
  
  app.listen(port, () => {
    console.log('Listening to port', port)
  })