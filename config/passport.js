// load all the things we need
var passport = require("passport");
var LocalStrategy    = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
require('dotenv').config();

// load up the user model
var User       = require('../models/user');

// Get Credentials
var configAuth = require('./auth.js');




module.exports = function(passport) {
    
    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session


passport.serializeUser(function(user, done) {
  done(null, user.id);
});
 
passport.deserializeUser(function(id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

//LOCAL STRATEGIE

//LOCAL-SIGNUP
passport.use('local-signup',new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
},
  function(req, email, password, done) {
    if(email) {email = email.toLowerCase();}
    process.nextTick(function() {
      if(!req.user) {
        User.findOne({'local.email': email}, function(err, user) {
          if(err) {  return done(err);   }
          if(user) {
             return done(null, false, req.flash('error', 'That email is already taken.'));
          } else {
             User.findOne({'facebook.email': email}, function(err, fbUser) {
                 if(err) { return done(err)
                 } if (fbUser) {
                    //  User.findById(fbUser.id, function(err, foundUser) {
                    //      if (err) { return done(err); }
                         fbUser.local.username = req.body.username;
                         fbUser.local.email    = email;
                         fbUser.local.password = fbUser.generateHash(password);
                         if(req.body.adminCode === process.env.ADMIN_CODE) {
                            fbUser.local.isAdmin = true;
                         } 
                         fbUser.save( function(err) {
                             if(err) { return done(err)};
                             return done(null, fbUser);
                         })
                          
                    // })
                 } else {
                    var newUser = new User();
                    newUser.local.username = req.body.username;
                    newUser.local.email    = email;
                    newUser.local.password = newUser.generateHash(password);
                    if(req.body.adminCode === process.env.ADMIN_CODE) {
                    newUser.local.isAdmin = true;
                 }
                     console.log(newUser);
                     newUser.save(function(err) {
                     if (err) { return done(err); }
                        return done(null, newUser);
                     })
                     
                 }
             })
    
            
          }
        })
      } else {
         return done(null, false), req.flash('error', 'You are already logged in.')
      }
    });
}));




//LOCAL-LOGIN
passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
},
  function(req, email, password, done) {
    process.nextTick(function() {
    User.findOne({ 'local.email': email }, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false, req.flash('error', 'No such email address exists.')); }
      
      if (!user.validPassword(password)) { return done(null, false,  req.flash('error', 'Incorrect password.')); }
      return done(null, user);
    });
  });
}));



//FACEBOOK STRATEGIE

passport.use(new FacebookStrategy({
    clientID: configAuth.facebookAuth.clientID,
    clientSecret: configAuth.facebookAuth.clientSecret,
    callbackURL: configAuth.facebookAuth.callbackURL,
    profileFields: configAuth.facebookAuth.profileFields
  },
  function(accessToken, refreshToken, profile, done) {
     process.nextTick(function() {
    User.findOne({'facebook.id': profile.id }, function(err, user) {
      if (err) { return done(err); }
      if (user) { // if the user is found, then log them in
            return done(null, user); // user found, return that user
      } else {
            User.findOne({'local.email': profile.emails[0].value}, function(err, localUser) {
                 if(err) { return done(err)
                 } if (localUser) {
                     localUser.facebook.id = profile.id;
                     localUser.facebook.token = accessToken;
                     localUser.facebook.email = profile.emails[0].value;
                     localUser.facebook.photo = profile.profile_pic;
                     localUser.facebook.username = createUsername(profile)
                      localUser.save(function(err) {
                          if (err) { throw err; }
                          return done(null, localUser);
                    });
                 } else {
                     var newUser = new User();
                     newUser.facebook.id = profile.id;
                     newUser.facebook.token = accessToken;
                     newUser.facebook.email = profile.emails[0].value;
                     newUser.facebook.photo = profile.profile_pic;
                     newUser.facebook.username = createUsername(profile)
                     newUser.save(function(err) {
                          if (err) { throw err; }
                          return done(null, newUser);
                    });
                 }
            })
          }
       });
    })
  
}));






// HELPER 

function createUsername(profile) {
    var username = undefined;
    if(profile.username) {
        username = profile.username;
    } else if(profile.displayName) {
        username = profile.displayName;
    } else if(profile.name) {
        if(profile.name.givenName && profile.name.middleName && profile.name.familyName) {
            username = profile.name.givenName + " " + profile.name.middleName +  " " + profile.name.familyName;
        } else if (profile.name.givenName && profile.name.familyName) {
            username = profile.name.givenName + " " + profile.name.familyName;
        } else {
            username = profile.name.givenName;
        }
    } 
    return username;
}
    
    
}