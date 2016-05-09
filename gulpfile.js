'use strict';

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('compress', function() {
    gulp.src('index.js')
        .pipe(uglify())
        .pipe(rename('jsonp-sandbox.min.js'))
        .pipe(gulp.dest('dest'));
});

gulp.task('default', function() {
    gulp.watch('index.js', ['compress']);
});