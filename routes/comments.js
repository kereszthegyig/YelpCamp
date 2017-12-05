
var express = require("express");
var router  = express.Router({mergeParams: true});
var Campground = require("../models/campground");
var Comment = require('../models/comment');
var middleware = require('../middleware')           //because of the index.js default name

//===========================
// COMMENTS ROUTES
//===========================

///////////////////////////////////////
//NEW
router.get('/new', middleware.isLoggedIn, function(req, res) {
    Campground.findById(req.params.id, function (err, campground) {
        if(err) {
            console.log(err);
        } else {
            res.render('comments/new', {campground: campground});
        }
    });
});
  
///////////////////////////////////////  
//CREATE 

router.post('/', middleware.isLoggedIn, function(req, res) {
   Campground.findById(req.params.id, function(err, foundCampGround){
       if(err) {
            res.redirect('/campgrounds/');
       } else {
            Comment.create(req.body.comment, function(err, comment) {
                if(err) {
                    console.log(err);
                } else {
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.author.avatar = req.user.avatar;
                    comment.save();
                    foundCampGround.comments.push(comment);
                    foundCampGround.save();
                    console.log(req.user.username);
                    req.flash('success', "Successfully added comment." );
                    res.redirect('back')
                }
            });
        }
   });
});

///////////////////////////////////////
//EDIT

router.get('/:comment_id/edit', middleware.checkCommentOwnership, function(req, res) {
    Campground.findById(req.params.id, function(err, foundCampground) {
                if(err || !foundCampground) {
                    req.flash('error', 'No Campground found.');
                    res.redirect('back');
                }
                Comment.findById(req.params.comment_id, function(err, foundComments) {
                if(err) {
                  res.redirect('back');
                  
                } else {
                  res.render('comments/edit', {campground_id: req.params.id, comment: foundComments});
              }
        });
    });
});

///////////////////////////////////////
//UPDATE

router.put('/:comment_id', middleware.checkCommentOwnership, function(req, res) {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function (err, updatedComment) {
        if(err) {
            res.redirect('back');
        } else {
            res.redirect("/campgrounds/" + req.params.id);
        }
    } );
});

///////////////////////////////////////
//DELETE
router.delete('/:comment_id', middleware.checkCommentOwnership, function(req, res) {
   Comment.findByIdAndRemove(req.params.comment_id, function(err, removedComment) {
       if(err) {
           res.redirect("back");
       } else {
          req.flash('success', "Comment has successfully deleted" );
          res.redirect('/campgrounds/' + req.params.id);
       }
   }) ;
});





module.exports = router;