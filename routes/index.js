var express             = require("express");
var router              = express.Router();
var passport            = require("passport");
var User                = require("../models/user");
var Campground          = require("../models/campground");
var async               = require("async");
var nodemailer          = require("nodemailer");
var crypto              = require('crypto');

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
var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.CLOUD_KEY, 
  api_secret: process.env.CLOUD_SECRET
});


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

router.post('/register', upload.single('avatar'), function(req, res) {
    cloudinary.uploader.upload(req.file.path, function(result) {
         var newUser = new User({username: req.body.username, firstName: req.body.firstName, lastName: req.body.lastName, email: req.body.email, avatar: result.secure_url});
         if(req.body.adminCode === process.env.ADMIN_CODE) {
            newUser.isAdmin = true;
         }
            User.register(newUser, req.body.password, function(err, user) {
                if(err) {
                    console.log(err);
                    return res.render("register", {error: err.message});
                    
                } else {
                    passport.authenticate('local')(req, res, function () {
                        req.flash('success', "Welcome to YelpCamp " + user.username);
                        res.redirect('/campgrounds');
                
                    });
                }
    
        });
    });
});


///////////////////////////////////////
//LOGIN ROUTE

 router.get('/login', function(req, res) {
     res.render('login',{page: 'login'});
 });
 
 router.post('/login', passport.authenticate('local',{
         successRedirect: '/campgrounds',
         failureRedirect: '/login'
     }), function(req, res){
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
          User.findOne({email: req.body.email}, function(err, foundUser) {
             if(!foundUser) {
                 req.flash('error', 'No account with that email address exists.');
                 return res.redirect('/forget');
             } else {
                 foundUser.resetPasswordToken = token;
                 foundUser.resetPasswordExpires = Date.now() +  36000000; /// + 1 hour
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
                to: foundUser.email,
                subject: 'Password Reset',
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                      'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                      'https://' + req.headers.host + '/reset/' + token + '\n\n' +
                      'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err){
                 console.log('mail sent');
                 req.flash('success', 'An e-mail has been sent to ' + foundUser.email + ' with further instructions.');
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
   User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() }}, function(err, foundUser) {
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
          User.findOne({ resetPasswordToken:req.params.token, resetPasswordExpires: { $gt: Date.now() }}, function(err, foundUser) {
              if(!foundUser) {
                  req.flash('error', 'Password reset token is invalid or has expired.');
                  return res.redirect('back');
              } else {
                  if(req.body.password === req.body.passwordConf) {
                      foundUser.setPassword(req.body.password, function(err){
                            foundUser.resetPasswordToken = undefined;
                            foundUser.resetPasswordExpires = undefined;
                            
                            foundUser.save(function(err) {
                                req.logIn(foundUser, function(err) {
                                    done(err, foundUser);
                                });
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
              to: foundUser.email,
              subject: 'Your password has been changed',
              text:  'Hello,\n\n' +
                     'This is a confirmation that the password for your account ' + foundUser.email + ' has just been changed.\n'
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


