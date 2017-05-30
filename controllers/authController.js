const passport = require('passport');

exports.login = passport.authenticate('local', { //Local is name & email address
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You are now logged in!'
});