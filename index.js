import express from 'express';
import env from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import Router from './src/routes/index.js';
import passport from './src/config/passport.js';

env.config();


const app = express();

app.use(express.json())
app.use(bodyParser.json());

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
  }));

let PORT = process.env.PORT || 5000;
app.use(passport.initialize());

app.use('/api', Router);

app.listen(PORT, () => console.log(`🚀 server is running on port ${PORT}`));

app.use((err,req,res,next)=>{
    
    const statusCode = err.statusCode || 500;
    const message = err.message || '❌ Internal server Error';
    return res.status(statusCode).json({
        success : false,
        statusCode,
        message
    })
})