//jshint esvesion:6
/*VESRION-1 - WEBSITE WITH LOCALY HOST DATABASE*/
/********************REQUIRE REQUESTS****************/
const express = require("express");
const bodyParser=require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require ("lodash");
const date = require(__dirname+"/date.js");

const app = express();


app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
  extended:true
}));
app.use(express.static("public"));

app.traceDeprecation = true;
mongoose.connect("mongodb://localhost:27017/MytodolistDB2", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
// mongoose.set("useFindAndModify", false);
// mongoose.set("useCreateIndex", true);

let get_date= date.getDate();
let today_date = date.getDate();

/******************** MONGOOSE SCHEMA ****************/
const itemsSchema=new mongoose.Schema({         //DB FOR TODOLIST
  name: {
    type: String,
    required: [true, "no task added"],
    index:true,
    sparse:true
  }
});

const Item = new mongoose.model("Item",itemsSchema);

const taskSchema = {                 //DB FOR COMPLETED LIST
  name: {
    type: String,
    dropDups: true,
    required: [true, "no task added"],
    index:true,
    sparse:true
  }
};
const Task = mongoose.model("Task", taskSchema);

const listSchema = {            //DB FOR SPECIFIC DATE LIST
  name: {
    type: String,
    unique: true,
    dropDups: true,
    required: [true, "no task added"],
    index:true,
    unique:true,
    sparse:true
  },
  items: [itemsSchema],
  completedItems:[taskSchema]
};
const List = mongoose.model("List", listSchema);

const item1 = new Item({
  name: "Welcome to your todolist!"
});
const item2 = new Item({
  name: "Hit the + button to add a new item"
});
const item3 = new Item({
  name: "⬅ Hit this to delete an item."
});
const defaultItems = [item1, item2, item3];

/******************** GET REQUESTS ****************/

app.get("/",function(req,res){
  List.findOne({name:today_date},function(err,foundList){
    if(!err){
      if(!foundList){
        const list = new List({
          name:today_date,
          items:defaultItems
        });

        list.save();
        res.redirect("/");
      }else{
        res.render("list",{listTitle:foundList.name,newListItems:foundList.items,newTaskItems:foundList.completedItems});
      }
    }
  })
});

app.get('/favicon.ico', (req, res) => {
  return 'your faveicon'
});

app.get("/specificDate",function(req,res){
  List.findOne({name:get_date},function(err,foundList){
      if(!err){
        if(!foundList){
          console.log("List Doesn't Exist");
          //Create a new list
          const list = new List({
            name:get_date,
            items:defaultItems
          });
          list.save();
          res.redirect("/specificDate");
        }else{
          console.log("List Exists");
          res.render("list",{listTitle:foundList.name , newListItems:foundList.items, newTaskItems: foundList.completedItems})
          // res.redirect("/")
        }
      }
  })
});

/******************** POST REQUESTS ****************/

app.post("/", function(req, res) {

  const itemName = req.body.newItem;
  const listName = req.body.list;

  console.log(itemName +" added in ["+ listName+"]" )
  const item = new Item({
    name: itemName
  });

  List.findOne({name:listName} , function(err , foundList){
    foundList.items.push(item);
    foundList.save();
    if(listName === today_date){
      res.redirect("/");
    }else{
      res.redirect("/specificDate");
    }
  })

});

app.post("/delete", function(req, res) {
  const checkItemId = req.body.checkbox;
  const listName = req.body.listName;


     List.findOne({name:listName},function(err, foundList){

       foundList.items.filter((e,i)=>{
         if(e._id == checkItemId){
           if(e.name == "Welcome to your todolist!" || e.name == "Hit the + button to add a new item" || e.name == "⬅ Hit this to delete an item." ){
             console.log("cannot be deleted");
           }else{
             const CTask = new Task({
               name:e.name
             })
             foundList.completedItems.push(CTask);
             foundList.save();

             const newList = foundList.items.filter((e)=>{
               return e._id != checkItemId;
             })
             foundList.items = newList;
             console.log(e.name+ " deleted from the list ["+listName+"]")
           }
         }
      })
      if(listName==today_date){
            res.redirect("/");
          }else{
            res.redirect("/specificDate")
          }
     })
});

app.post("/specificDate" , function(req , res){
  const new_date = new Date(req.body.newDate);
  const options = {
    weekday: "long",
    day: "numeric",
    month: "long"
  };
  console.log(new_date.toLocaleDateString("en-US", options));
  get_date=new_date.toLocaleDateString("en-US", options);
  res.redirect("/specificDate");
})
/****************************************************** LISTEN REQUESTS ********************************************************************/



let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


app.listen(port, function() {
  console.log("Server has started successfully");
});
