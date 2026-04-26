const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

app.get("/", (req,res)=>{
    res.send("Backend running");
});

app.get("/test-nlp", async(req,res)=>{
   try{
      const response = await axios.post(
        "http://localhost:8000/analyze?text=I am scared"
      );

      res.json(response.data);

   } catch(error){
      res.status(500).send("NLP error");
   }
});

app.listen(5000, ()=>{
   console.log("Server running on port 5000");
});