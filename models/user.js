var mongoose                = require("mongoose"),
    bcrypt                  = require("bcrypt");
    

var UserSchema = new mongoose.Schema({
    
    local: {
        username     : String, 
        email        : String,
        password     : String,
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        isAdmin: {type: Boolean, default: false}
    },
    
     facebook         : {
        id           : String,
        token        : String,
        email        : String,
        username     : String,
        photo        : String
    }
});


UserSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

UserSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};
    
    

module.exports = mongoose.model('User', UserSchema);