//jshint esvesion:6
/*VESRION-1 - WEBSITE WITH LOCALY HOST DATABASE*/
/********************REQUIRE REQUESTS****************/
require("dotenv").config();                //npm i dotenv
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
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-find-or-create'); //level-6

app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
  extended:true
}));
app.use(express.static("public"));

app.traceDeprecation = true;
mongoose.connect("mongodb+srv://admin-basudev:test123@cluster0.nbsww.mongodb.net/MytodolistDB", {
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
    // unique: true,
    required: [true, "no task added"],
    index:true,
    sparse:true
  },
  items: [itemsSchema],
  completedItems:[taskSchema]
};
const List = mongoose.model("List", listSchema);

const userSchema = new mongoose.Schema({ //DB for authentification
  email: String,
  password: String,
  username: String, //Level - 6 Google Auth
  UniqueList:[listSchema]
});

userSchema.plugin(passportLocalMongoose);  //Level 5
userSchema.plugin(findOrCreate); //Level 6   method of mongoose-find-or-create


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) { //method from passport package which will work with anykind of authentication  Level-6
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {  //level-6
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/SmartToDoList",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ username: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

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
    let val = false;
    User.findOne({_id:req.user._id},function(err,foundUser){
      console.log(foundUser.username);
      foundUser.UniqueList.some(function(foundList){
        val = (foundList.name === today_date)
        if(val==true){
          // console.log("List Found")
          res.render("list",{listTitle:foundList.name,newListItems:foundList.items,newTaskItems:foundList.completedItems,userID:req.user._id});
          return true;
        }
      })
      if(val == false){
        console.log("List Not Found");
        const list = new List({
          name:today_date,
          items:defaultItems
        });
        req.user.UniqueList.push(list);
        req.user.save();
        res.redirect("/");
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
  if(req.isAuthenticated()){
    let val = false;
    User.findOne({_id:req.user._id},function(err,foundUser){
      foundUser.UniqueList.some(function(foundList){
        val = (foundList.name === get_date);
        if(val){
          console.log(foundList.name + " List Exist");
          res.render("list",{listTitle:foundList.name,newListItems:foundList.items,newTaskItems:foundList.completedItems,userID:req.user._id});
          return true;
        }

      })
      if(val == false){
        console.log(get_date + " List doesn't Exist");
        const list = new List({
          name:get_date,
          items:defaultItems
        });
        req.user.UniqueList.push(list);
        req.user.save();
        return res.redirect("/specificDate");
      }

    })
  }else{
    res.redirect("/login");
  }

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

app.get("/auth/google", //level 6
  passport.authenticate("google", {
    scope: ["profile"]
  })
);

app.get("/auth/google/SmartToDoList", //level 6   //google redirect to this page
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect to list
    // res.send("Authenticated By Google")
    res.redirect("/list")
  });
/******************** POST REQUESTS ****************/

app.post("/list", function(req, res) {

  const itemName = req.body.newItem;
  const listName = req.body.list;
  const userID = req.body.LoggedInUserID;


  console.log(itemName +" added in ["+ listName+"]" )
  const item = new Item({
    name: itemName
  });

  User.findOne({_id:userID},function(err,foundUser){
    foundUser.UniqueList.forEach(function(foundList){
      if(foundList.name===listName){
        foundList.items.push(item);
        foundUser.save();
        if(listName === today_date){
           res.redirect("/");
        }else{
           res.redirect("/specificDate");
        }
      }
    })
  })


});

app.post("/delete", function(req, res) {
  const checkItemId = req.body.checkbox;
  const listName = req.body.listName;
  const userID = req.body.LoggedInUserID;

  User.findOne({_id:userID},function(err,foundUser){
    foundUser.UniqueList.forEach(function(foundList){
      if(foundList.name === listName){
        foundList.items.forEach((e,i)=>{
          if(e._id == checkItemId){
            if(e.name == "Welcome to your todolist!" || e.name == "Hit the + button to add a new item" || e.name == "⬅ Hit this to delete an item." ){
              console.log("cannot be deleted")
            }else{
              const CTask = new Task({
                name:e.name
              })
              foundList.completedItems.push(CTask);
              foundUser.save();

              const newList = foundList.items.filter(e=>{
                return e._id != checkItemId;
              })
              foundList.items = newList;
              console.log(e.name+ " deleted from the list ["+listName+"]")
            }
          }
        })
      }
    })
    if(listName==today_date){
      res.redirect("/");
    }else{
      res.redirect("/specificDate")
    }
  })

});

app.post("/refresh",function(req,res){
  const itemArray = req.body.refreshButton;
  const listName = req.body.listName;
  const userID = req.body.LoggedInUserID;
  function UndeletedItems(x){
    if(x.name == "Welcome to your todolist!" || x.name == "Hit the + button to add a new item" || x.name == "⬅ Hit this to delete an item.")
      return true;
    return false;
  }
  User.findOne({_id:userID},function(err,foundUser){
    foundUser.UniqueList.forEach(function(foundList){
      const newList = foundList.items.filter(UndeletedItems)
      foundList.items = newList;
      foundList.completedItems = [];
    })
    foundUser.save();
  })
  if(listName==today_date){
      res.redirect("/");
    }else{
      res.redirect("/specificDate")
    }

})

app.post("/specificDate" , function(req , res){
  const new_date = new Date(req.body.newDate);
  const options = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year:"numeric"
  };
  // console.log(new_date.toLocaleDateString("en-US", options));
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
