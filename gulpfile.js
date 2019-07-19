const { src, dest, parallel } = require('gulp');
const uglify = require('gulp-terser');
const rename = require('gulp-rename');
const concat = require('gulp-concat');

function build() {
  return src('src/*.js')
    .pipe(concat('all.js'))
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(dest('site/'));
}

exports.default = build