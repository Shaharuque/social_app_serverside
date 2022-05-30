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


//Jwt token verify jeita client thekey asha token k verify korbo
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  //bairey thekey get req korley authHeader thekar proshno e uthey na tai ai case a Unauthorized access boley dibo
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}

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

    //get order data from DB for each user basis on his email to showcase each user orders in his dashboard but if the user don't have accesstoken then verify jwt will stop the user from seeing orders data means outside thekey get api tey hit korley shey kono user ar orders dekhtey parbey na..so security is implemented
    app.get('/order',verifyJWT,async(req,res)=>{
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
      //user ar info DB tey set korar por ekta access token generate korey dibo and sheita client side a pathabey
      const token=jwt.sign({email:user_email},process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})
      res.send({
        //user ar email jodi authenticated hoy tokhn e user k token supply dibey otherwise not
        success: true,
        result:result,
        accessToken: token,
      })
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