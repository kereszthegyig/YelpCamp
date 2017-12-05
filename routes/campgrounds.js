var express = require("express");
var router  = express.Router();
var Campground = require("../models/campground");
var middleware = require('../middleware') ;          //because of the index.js default name
var geocoder = require('geocoder');

///////////////////////////////////////
// MULTER

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
//INDEX  - show all campgrounds

router.get('/', function(req, res) {
    var noMatch = null;
   
   //SEARCH AJAX 
    if(req.query.search && req.xhr) {
         var regex = new RegExp(escapeRegExp(req.query.search), 'gi');
         Campground.find({name: regex}, function(err, result) {
            if(err) {
                console.log(err);
            } else {
                res.status(200).json(result);
            }
        });
    } else {
        Campground.find({}, function(err, result) {
        if(err) {
            console.log(err);
        } else {
            if(req.xhr) {
                res.json(result);
            } else {
                res.render('campgrounds/index', {campgrounds: result, page:'campgrounds', noMatch});
            }
        }
    });
}});

///////////////////////////////////////
// CREATE - ADD NEW CAMPGROUND TO THE DB

router.post('/',  middleware.isLoggedIn, upload.single('image'), function(req, res) {
    //GEOCODER
    geocoder.geocode(req.body.location, function (err, data) {              
        
    //CLOUDINARY UPLOAD   
         cloudinary.uploader.upload(req.file.path, function(result) {           
                 var image = {
                     path: result.secure_url,
                     id: result.public_id
                 };
                 
                 var name = req.body.name;
                 var price = req.body.price;
                 var description = req.body.description;
                 var author = {
                    id: req.user._id,
                    username: req.user.username
                };
               if(!data.results[0]) {
                    var lat = 90;
                    var lng = 0;
                    var location = "North Pole";
                   
               } else {
                 lat = data.results[0].geometry.location.lat;
                 lng = data.results[0].geometry.location.lng;
                 location = data.results[0].formatted_address;
               }
                
                var newCampground = {name: name, price: price, image: image, description: description, author: author, location: location, lat: lat, lng: lng};
          //create      
            Campground.create(newCampground, function(err, result) {
             if(err) {
                 console.log(err);
             } else {
                 console.log(result);
                 res.redirect('/campgrounds');
             }
             
            });  
        });
    });
});

///////////////////////////////////////
//NEW -show form to create new campground

router.get('/new', middleware.isLoggedIn, function(req,res) {
    res.render('campgrounds/new');
});

///////////////////////////////////////
//SHOW - shows more info about one campground

router.get('/:id', function(req, res) {
    
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampGround) {
       if(err || !foundCampGround) {
           req.flash('error', 'Campground not found');
           res.redirect('back')
       } else {
           console.log(foundCampGround);
           res.render('campgrounds/show', {campground: foundCampGround});
       }
    });
});

///////////////////////////////////////
//EDIT Route

router.get('/:id/edit', middleware.checkCampgroundOwnership, upload.single('image'), function(req, res) {
         Campground.findById(req.params.id, function(err, foundCampground){
             if (err || !foundCampground) {
                 req.flash('error', 'Campground not found');
                 res.redirect('back')
             } else {
                 res.render('campgrounds/edit', {campgrounds: foundCampground});
             }
        });
});

///////////////////////////////////////
//Update Route

router.put('/:id', middleware.checkCampgroundOwnership, upload.single('image'), function(req, res){
    Campground.findById(req.params.id, function(err, foundCampGround) {
            if(err || !foundCampGround) {
                 req.flash('error', 'Campground not found');
                 res.redirect('back') ;
            } else {
                
                var uploadPath = foundCampGround.image.path;
                var destroyID = foundCampGround.image.id;
            
                console.log('1-----' + uploadPath + 'ID: ' + destroyID);
                
            }   
        
        geocoder.geocode(req.body.location, function (err, data) {
          if(req.file !== undefined) {
             uploadPath = req.file.path;
          }
           
          cloudinary.uploader.upload(uploadPath, function(result) {
            if (data.status == 'OK') {
                var lat = data.results[0].geometry.location.lat;
                var lng = data.results[0].geometry.location.lng;
                var location = data.results[0].formatted_address;
                
                var newData = {name: req.body.name, image: {path: result.secure_url, id: result.public_id}, description: req.body.description, price: req.body.price, location: location, lat: lat, lng: lng};
             
                 Campground.findByIdAndUpdate(req.params.id, {$set: newData}, function(err, updatedCampground) {
                     if(err || !updatedCampground) {
                          req.flash("error", err.message);
                          res.redirect("back");
                     } else {
                          cloudinary.uploader.destroy(destroyID, function(result) {
                      console.log('Picture is destroyed: ' + destroyID);
                 
                        });
                            req.flash("success","Successfully Updated!");
                            res.redirect('/campgrounds/' + req.params.id);
                             console.log('7-----' + updatedCampground);
                             
                     }
                 });
            } else {
               req.flash('error', 'Geocode was not successful for the following reason: ' + data.status)
               res.redirect('/campgrounds/' + req.params.id);
            }
           });
        });
    });
});
            
           
///////////////////////////////////////
// DELETE ROUTE

router.delete('/:id', middleware.checkCampgroundOwnership, function(req, res) {
   Campground.findByIdAndRemove(req.params.id, function(err, removedCampground) {
            res.redirect('/campgrounds');
        });
});


// REGEX Function
function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}


module.exports = router;
