var express         = require("express"),
    app             = express(),
    bodyParser      = require("body-parser"),
    mongoose        = require("mongoose"),
    flash           = require('connect-flash'),
    Campground      = require("./models/campground"),
    Comment         = require("./models/comment"),
    // seedDB          = require("./seeds"),
    passport        = require("passport"),
    LocalStrategy   = require("passport-local"),
    //passportLocalMongoose = require("passport-local-mongoose"),
    User            = require("./models/user"),
    methodOverride  = require('method-override');
    
var commentRoutes       = require("./routes/comments"),
    campgroundRoutes    = require("./routes/campgrounds"),
    indexRoutes         = require("./routes/index");
    
require('dotenv').config();
    
var url = process.env.MONGODB_URL || 'mongodb://localhost/yelp_camp';
 mongoose.Promise = global.Promise;

mongoose.connect(process.env.MONGODB_URL, {useMongoClient: true});  

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine','ejs');
app.use(express.static(__dirname + "/public"));
app.use(methodOverride('_method'));
app.use(flash());



//PASSPORT CONFIGURATION

app.use(require('express-session')({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());



app.locals.moment= require("moment");

app.use(function(req, res, next) {
    
     res.locals.currentUser = req.user;
     res.locals.error      = req.flash("error");
     res.locals.success    = req.flash('success');
     next();
});

app.use('/', indexRoutes);
app.use('/campgrounds',campgroundRoutes);
app.use('/campgrounds/:id/comments',commentRoutes);


app.listen(process.env.PORT, process.env.IP, function() {
    console.log('Server has started!');
});
