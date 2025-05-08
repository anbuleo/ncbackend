import jwt from "jsonwebtoken";
import { errorHandler } from "./errorHandler.js";

export const verifyUser = (req, res, next) => {
    const token =req.headers.authorization.split(" ")[1]

    if(!token) return next(errorHandler(401, 'Unauthorised'))

    let decode = jwt.decode(token)
    let currentTime  = Math.round((+new Date())/1000)
    if(currentTime > decode.exp) return next(errorHandler(400,'Session Expried login'))
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return next(errorHandler(403, "Token is not valid!"));
        }
        req.user = user;
        next();
    });
};


 