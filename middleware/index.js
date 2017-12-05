// all the middlewares goes here

var Campground = require('../models/campground');
var Comment = require('../models/comment');
var User    = require("../models/user");

var middlewareObj = {};

//checkCampgroundOwnership

middlewareObj.checkCampgroundOwnership = function(req, res, next) {
      if (req.isAuthenticated()){
        Campground.findById(req.params.id, function(err, foundCampground){
        if(err || !foundCampground) {
            req.flash('error', "Campground not found." );
           res.redirect('back');
        } else {
            if(req.user.isAdmin || foundCampground.author.id.equals(req.user._id)){
                 next();
            } else {
                res.redirect('back');
            }
        }
    });
        
    }else {
        req.flash('error', "You don't have the permission to do that." );
        res.redirect("back");
    }
};

//checkCommentOwnership

middlewareObj.checkCommentOwnership = function(req, res, next) {
    if(req.isAuthenticated()) {
        Comment.findById(req.params.comment_id, function(err, foundComment) {
            if(err || !foundComment) {
                req.flash('error', "Comment not found." );
                res.redirect('back');
            } else {
                if(req.user.isAdmin || foundComment.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash('error', "You don't have the permission to do that." );
                    res.redirect('back');
                }
            }
        });
    } else {
        req.flash('error', "You need to be logged in to do that." );
        res.redirect("back");
    }
};

//isLoggedIn 

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    } else {
        req.flash("error", "You need to be logged in to do that.");
        res.redirect('/login');
    }
}
    








module.exports = middlewareObj;