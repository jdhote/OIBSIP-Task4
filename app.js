if(process.env.NODE_ENV != "production")
{
    require('dotenv').config();
}





const express = require("express");
const app = express();
const path = require("path");
const mongoose = require('mongoose');
const User=require("./models/user.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const passport=require("passport");
const LocalStrategy = require("passport-local");
const flash =require("connect-flash");

app.use(express.static('public'));

//CONNECTING DB
const MONGO_URL="mongodb://127.0.0.1:27017/login-clone";

// const dbUrl=process.env.ATLASDB_URL;

main()
  .then(()=>{console.log("connected to db");})
  .catch((err)=>{console.log(err);});

async function main(){
    await mongoose.connect(MONGO_URL);
}


app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'));

// Use express-session middleware
// mongo store
const store = MongoStore.create({
    mongoUrl:MONGO_URL,
    crypto:{
        secret:process.env.SECRET,
    },
    touchAfter:24*3600,
})

store.on("error",()=>{
    console.log("error in mongo session store",err);
})

const sessionOptions=
{   store,
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires: Date.now()+ 7*24*60*60*1000,
        maxAge:  7*24*60*60*1000,
        httpOnly:true,// for security purpose(prevents from cross_scripting attacks);
    },
};

// sessions
app.use(session(sessionOptions));
app.use(flash());


// implementing passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.curUser=req.user;
    next();
})
  
app.get("/",(req,res)=>{
    res.send("HI i am root!");
});

app.get("/dashboard",(req,res)=>{
    res.render("./dashboard/dashboard.ejs");
});

// Login route
app.get("/login",(req,res)=>{
    res.render("./users/login.ejs")
});

app.post("/login", passport.authenticate("local", {
    //   res.send("User logged in successfully!");
    successRedirect: "/profile",
  failureRedirect: "/login",
  failureFlash: true
    
    }));
    
// Signup route
app.get("/signup",(req,res)=>{
    res.render("./users/signup.ejs")
});

app.post("/signup", async (req, res) => {
    const { email, username, password } = req.body;
  
    try {
      // Register user with Passport-Local-Mongoose
      await User.register(new User({ email, username }), password);
  
      // Authenticate the user immediately after registration
      passport.authenticate("local")(req, res, () => {
        // Redirect to the secured profile page
        res.redirect("/profile");
      });
   

    }catch (err) {
        if (err.name === 'UserExistsError') {
          // User with the same username already exists
          req.flash("error", "Username is already registered. Please choose a different username.");
          res.redirect("/signup"); // Redirect to the signup page
        } else {
          console.error(err);
          res.status(500).send("Error registering user.");
        }
      }
  });

  // Logout route
app.get("/logout", (req, res) => {
    req.logout((err)=>{
        if(err)
        {
           return next(err);
        }
        req.flash("success","You are logged out now!");
        res.redirect("/dashboard");
    });
  });

// Protected route example
// app.get("/profile", isAuthenticated, (req, res) => {
//   res.send(`Welcome, ${req.user.username}! This is your profile.<a href="/logout">Logout</a>`);
// });


app.get("/profile", isAuthenticated, (req, res) => {
  res.render('./dashboard/profile.ejs', { username: req.user.username });
});
// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
};

const port =3000;
app.listen(port,()=>{
    console.log("server is listening at port 3000")
});