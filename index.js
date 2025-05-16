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

const allowedOrigins = [
  'http://localhost:3000',
  'https://nainaa-cabs.netlify.app',
  'https://nainaa-cabservice.netlify.app/',
  'https://nainaa-cabs.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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