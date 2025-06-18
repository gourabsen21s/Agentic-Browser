const express = require('express');
const {NODE_SERVER_PORT} = require("../shared/config.js");

const app = express();

app.use(express.json());

app.get('/',(req,res)=>{
    res.status(200).json({message:"Server is running successfully"});
})

app.listen(NODE_SERVER_PORT, ()=>{
    console.log(`[SERVER] Node.js Centralized Server listening on port ${NODE_SERVER_PORT}`);
    console.log(`[SERVER] Access server health check at http://localhost:${NODE_SERVER_PORT}/`);
})