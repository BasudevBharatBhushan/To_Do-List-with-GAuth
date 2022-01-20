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

// $ npm i passport passport-local passport-local-mongoose express-session
const session = require("express-session");  //Level 5
const passport = require("passport"); //Level 5
const passportLocalMongoose = require("passport-local-mongoose"); //Level 5

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

app.use(session({      //Level 5
  secret:"Our little secret.",
  resave:false,
  saveUninitialized:false
}));
app.use(passport.initialize());  //Level 5
app.use(passport.session());     //Level 5


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

const userSchema = new mongoose.Schema({ //DB for authentification
  email: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);  //Level 5


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

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

app.get("/list",function(req,res){
  if(req.isAuthenticated()){
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
  }else{
    res.redirect("/login");
  }

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
        
        }
      }
  })
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/",function(req,res){
  if(req.isAuthenticated()){
    res.redirect("/list");
  }else{
    res.render("home");
  }
});

app.get("/logout", function(req , res){
  //Method from passport local mongoose package
  req.logout();
  res.redirect("/");
});

/******************** POST REQUESTS ****************/

app.post("/list", function(req, res) {

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

app.post("/register",function(req , res){
  //Method from passport local mongoose package
  User.register({username:req.body.username},req.body.password, function(err , user){
    if(err){
      console.log(err);
      res.redirect("/register")
    }else{
      passport.authenticate("local")(req , res , function(){
        res.redirect("/list");
      });
    }
  })
});

app.post("/login",function(req , res){
  const user = new User({
    username : req.body.username,
    password : req.body.password
  });

  //Method from passport local mongoose package
  req.login(user,function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req , res , function(){
        res.redirect("/list");
      })
    }
  })
});
/****************************************************** LISTEN REQUESTS ********************************************************************/



let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


app.listen(port, function() {
  console.log("Server has started successfully");
});
