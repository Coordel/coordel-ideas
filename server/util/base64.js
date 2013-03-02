module.exports = {
  encode: function (unencoded) {
    return new Buffer(unencoded).toString('base64');
  },
  decode: function (encoded) {
    return new Buffer(encoded, 'base64').toString('utf8');
  }
};