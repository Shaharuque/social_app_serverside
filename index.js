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
    const reviewCollection=client.db('menufacturar').collection('reviews');

    //posting products to DB
    app.post('/addproduct',async (req,res)=>{
      const result=await productCollection.insertOne(req.body);
      res.status(200).send(result)
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

    //deleting product from database by admin
    app.delete('/deleteproduct/:id',async(req,res)=>{
      const product=await productCollection.findOneAndDelete({_id:ObjectId(req.params.id)});
      res.status(200).send({message: 'success'});
    })
    //updating product quantity by admin
    app.put('/updateproduct/:id',async(req,res)=>{
      const product=await productCollection.findOneAndUpdate({_id:ObjectId(req.params.id)},{$set:{quantity:req.body.quantity}});
      res.status(200).send({message: 'success'});
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
      const decodedEmail=req.decoded.email;
      //console.log('decodedemail',decodedEmail)
      //console.log('user_email',user_email)
      //JWT token jakey dewa hoisey(decodedEmail) tar email and je ai get req kortesey tar email same holei shudu takey orders data show korabo
      if(decodedEmail===user_email){
        //finding data
        const result=await orderCollection.find(query).toArray();
        return res.send(result);
      }
      else{
       return res.status(403).send({ message: 'forbidden access' });
      }
    })
    //order delete
    app.delete('/order/:id',async(req,res)=>{
      const result=await orderCollection.deleteOne({_id:ObjectId(req.params.id)});
      res.status(200).send({
        success: true,
        result:result,
      });
    })

    //get all users
    app.get('/all/users',async(req,res)=>{
      const users=await userCollection.find({}).toArray();
      res.send(users);
    })
    //single user get
    app.get('/user/:email',async(req,res)=>{
      const user=await userCollection.findOne({email:req.params.email});
      res.send(user);
      })

    //user role jodi admin hoy tahley 'true' return korbey ai api tey client thekey hit/req korley
    app.get('/admin/:email', async(req, res) =>{
      const email = req.params.email;   //ai email ta basically logged in user ar email
      const user = await userCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin})
    })  

    //userCollection a kono ekta user ar info update(role:'admin' add) //make admin 
      app.put('/user/makeAdmin/:email',verifyJWT,async(req,res)=>{
        const email = req.params.email;
        //site a logged in user email adress
        const requesterEmail = req.decoded.email;
        // const user=await userCollection.findOne({email:email});
        console.log(email)
        console.log(requesterEmail)

        //DB ar userCollection thekey logged in user ar info find korey requesterAccount tey save korbey
        const requesterAccount = await userCollection.findOne({ email: requesterEmail });
        //logged in user role=admin holey tobei sey onno user k role admin assign kortey parbey
        if(requesterAccount.role==='admin'){
          const result=await userCollection.updateOne({email:email},{$set:{role:'admin'}});
          res.send(result);
        }
        else{
          res.status(403).send({message: 'forbidden'});
        }
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
    //remove user by admin but admin can't remove other admin
    app.delete('/user/remove/:email',verifyJWT,async(req,res)=>{
      const email=req.params.email;
      const requesterEmail=req.decoded.email;
      const requesterAccount=await userCollection.findOne({email:requesterEmail});
      const user=await userCollection.findOne({email:email});
      if(requesterAccount.role==='admin' && user.role!=='admin'){
        const result=await userCollection.deleteOne({email:email});
        res.send(result);
      }
      else{
        res.status(403).send({message:'forbidden'});
      }
    })

  
    

    //add reviews by visitor users
    app.post('/review',async(req,res)=>{
      const review=req.body;
      const result=await reviewCollection.insertOne(review);
      res.send(result);
    })
    //get all the reviews
    app.get('/reviews',async(req,res)=>{
      const reviews=await reviewCollection.find({}).toArray();
      res.send(reviews);
    })

  } finally {

  }
}
run().catch(console.dir)

//root url=>'/'
app.get('/', (req, res) => {
    res.send('Running hamburg menufacturar Server Perfectly Yessss!');
  });
  
  //MEWAO LIFE
  
  app.listen(port, () => {
    console.log('Listening to port', port)
  })