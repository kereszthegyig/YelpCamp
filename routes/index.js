var express             = require("express");
var router              = express.Router();
var passport            = require("passport");
var User                = require("../models/user");
var Campground          = require("../models/campground");
var async               = require("async");
var nodemailer          = require("nodemailer");
var crypto              = require('crypto');


require('dotenv').config();
///////////////////////////////////////
//MULTER

var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter});


///////////////////////////////////////
//CLOUDINARY
//var cloudinary = require('cloudinary');
// cloudinary.config({
//   cloud_name: "dcvshooib", 
//   api_key: "885342146938272", 
//   api_secret: "4iLgcQWhgrScQd0snrZseNi7mX4"
// });


///////////////////////////////////////
//ROUTES
///////////////////////////////////////


///////////////////////////////////////
//INDEX
router.get('/', function(req, res) {
   res.render('landing'); 
});

//==========================
//  AUTHORIZATION ROUTES
//==========================

///////////////////////////////////////
//  REGISTER ROUTE

router.get('/register', function(req,res) {
    res.render('register', {page: 'register'});
});

router.post('/register', 
    passport.authenticate('local-signup', { 
          failureRedirect : '/register', // redirect back to the signup page if there is an error
          failureFlash : true // allow flash messages
}), function(req,res) {
    // Success
    req.flash("success", "Welcome to YelpCamp " + req.user.local.username + "!");
    res.redirect(`/profile/${req.user._id}/`);
});

   
        

///////////////////////////////////////
//LOGIN ROUTE

 router.get('/login', function(req, res) {
     res.render('login',{page: 'login'});
 });
 
 router.post('/login', passport.authenticate('local-login',{
        failureRedirect: "/login",
        failureFlash: true,
    }), function(req, res){
        req.flash("success","Welcome " + req.user.local.username + "!");
        res.redirect(`/profile/${req.user._id}`);
    }
);



router.get('/auth/facebook',
  passport.authenticate('facebook',{ scope : ['email', 'photos'] }));

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login', failureFlash : true}),
  function(req, res) {
    // Successful authentication, redirect home.
    req.flash('success', 'Welcome to YelpCamp ' + req.user.facebook.username + '! ')
    res.redirect('/campgrounds');
   
  });




///////////////////////////////////////
// LOGOUT ROUTE

router.get('/logout', function(req, res) {
    req.logout();
    req.flash("success", 'Logged you out!');
    res.redirect('/campgrounds');
});
















///////////////////////////////////////
// PASSWORD RESET ROUTES

// Show the forget page - GET
router.get('/forget', function(req, res) {
    res.render('forget');    
});


// SEND the request to reset the password- POST
router.post('/forget', function(req, res, next){
     // Waterfall -> go straight forward on the functions of an array
    async.waterfall([   
        //creating a random hash for the email and store in the token variable
        function(done) {
            crypto.randomBytes(20, function(err, buf) {         
                var token = buf.toString('hex');                
                done(err, token);                           
            });
          },
          //examine, that is there a user of the given email and if the user is exist, set the token and the value of expire in the database and SAVE
        function(token, done) {
          User.findOne({'local.email': req.body.email}, function(err, foundUser) {
             if(!foundUser) {
                 req.flash('error', 'No account with that email address exists.');
                 return res.redirect('/forget');
             } else {
                 foundUser.local.resetPasswordToken = token;
                 foundUser.local.resetPasswordExpires = Date.now() +  36000000; /// + 1 hour
                 foundUser.save(function(err) {
                     done(err, token, foundUser)
                 });
             };
          });  
        },
        // NODEMAILER // send the email for the foundUser (create transport, set the mail Options, sendMail)
        function(token, foundUser, done) {
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: process.env.EMAIL_ADRESS,
                    pass: process.env.EMAIL_PSW
                }
            });
            var mailOptions = {
                from: process.env.EMAIL_ADRESS,
                to: foundUser.local.email,
                subject: 'Password Reset',
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                      'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                      'https://' + req.headers.host + '/reset/' + token + '\n\n' +
                      'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err){
                 console.log('mail sent');
                 req.flash('success', 'An e-mail has been sent to ' + foundUser.local.email + ' with further instructions.');
                 done(err, done);
            });
        },
        
], function(err) {
        if(err) return next(err);
        res.redirect('/forget');
        
});
});

///////////////////////////////////////
// SHOW the NEW PASSWORD PAGE - GET

router.get('/reset/:token', function(req, res) {
   User.findOne({ 'local.resetPasswordToken': req.params.token, 'local.resetPasswordExpires': { $gt: Date.now() }}, function(err, foundUser) {
        if(!foundUser) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot');
        } else {
            res.render('reset', {token: req.params.token});
        }
   }); 
});

router.post('/reset/:token', function(req, res) {
    async.waterfall([
        function(done){
          User.findOne({ 'local.resetPasswordToken':req.params.token, 'local.resetPasswordExpires': { $gt: Date.now() }}, function(err, foundUser) {
              if(!foundUser) {
                  req.flash('error', 'Password reset token is invalid or has expired.');
                  return res.redirect('back');
              } else {
                  if(req.body.password === req.body.passwordConf) {
                      foundUser.local.password = foundUser.generateHash(req.body.password)
                      foundUser.local.resetPasswordToken = undefined;
                      foundUser.local.resetPasswordExpires = undefined;
                      
                            foundUser.save(function(err) {
                                req.logIn(foundUser, function(err) {
                                    done(err, foundUser);
                                });
                            });
                  } else {
                      req.flash('error', 'Passwords do not match');
                      return res.redirect('back');
                  }
              }
          }) ; 
        },
        
        function(foundUser, done){
          var smtpTransport = nodemailer.createTransport({
              service: 'Gmail',
              auth: {
                  user: process.env.EMAIL_ADRESS,
                  pass: process.env.EMAIL_PSW
              }
          });
          
          var mailOptions = {
              from: process.env.EMAIL_ADRESS,
              to: foundUser.local.email,
              subject: 'Your password has been changed',
              text:  'Hello,\n\n' +
                     'This is a confirmation that the password for your account ' + foundUser.local.email + ' has just been changed.\n'
          };
          
          smtpTransport.sendMail(mailOptions, function(err) {
              console.log('email sent');
              req.flash('success', 'Success! Your password has been changed!');
              done(err);
          });
        },
    ], function(err) {
        res.redirect('/campgrounds');
    });
    
});


///////////////////////////////////////
//User profiles routes

router.get('/profile/:id', function (req, res) {
    User.findById(req.params.id, function(err, foundProfile) {
        if(err) {
            console.log(err);
            req.flash('error', 'Something went wrong!');
            res.redirect('back');
        } else {
            Campground.find().where('author.id').equals(foundProfile._id).populate("comments").exec(function(err, foundCampgrounds){
                res.render('users/profile',{profile: foundProfile, campgrounds: foundCampgrounds});
            })
             
        }
    })
   
})


module.exports = router;


