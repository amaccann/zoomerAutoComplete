(function () {
  'use strict';

  require('shelljs/global');

  var gulp = require('gulp'),
      uglify = require('gulp-uglify'),
      rename = require("gulp-rename"),
      sass = require('gulp-sass'),
      base64 = require('gulp-base64'),
      changed = require('gulp-changed'),
      watch = require('gulp-watch'),
      connect = require('gulp-connect'),
      open = require('gulp-open'),
      index = 'example/index.html',
      openOptions,
      serverOptions,
      sourcePaths,
      destinationPaths;

  sourcePaths = {
    sass: 'src/sass/**/*.scss',
    js: 'src/js/**/*.js'
  };

  destinationPaths = {
    css: 'dist/css/',
    js: 'dist/js/'
  };

  openOptions = {
    url: 'http://localhost:8888/example'
  };

  serverOptions = {
    livereload: true,
    port: 8888
  };

  gulp.task('compile-sass', function () {
    gulp.src(sourcePaths.sass)
      .pipe(changed(destinationPaths.css))
      .pipe(sass().on('error', sass.logError))
      .pipe(base64({
        baseDir: 'src/images',
        extensions: ['svg', 'png', /\.jpg#datauri$/i],
        debug: true
      }))
      .pipe(gulp.dest(destinationPaths.css))
      .pipe(connect.reload());
  });

  gulp.task('compile-js', function () {
    gulp.src(sourcePaths.js)
      .pipe(changed(destinationPaths.js))
      .pipe(uglify())
      .pipe(rename({
        suffix: '-min',
      }))
      .pipe(gulp.dest(destinationPaths.js))
      .pipe(connect.reload());
  });

  gulp.task('reload', function () {
    return gulp.src(index).pipe(connect.reload());
  });

  gulp.task('watch-js', function () {
    gulp.watch(sourcePaths.js, [ 'compile-js' ]);
  });

  gulp.task('watch:sass', function () {
    gulp.watch(sourcePaths.sass, [ 'compile-sass' ]);
  });

  gulp.task('run-server', [], function () {
    return connect.server(serverOptions);
  });

  gulp.task('open-browser', ['run-server'], function () {
    return gulp.src(index)
      .pipe(open('', openOptions));
  });

  gulp.task('serve', ['open-browser', 'watch-js', 'watch:sass']);
  gulp.task('build', [ 'compile-js', 'compile-sass' ])

}());


