var assert = require('assert'),
    cover = require('../index.js'),
    through2 = require('through2'),
    fs = require('fs'),
    path = require('path'),
    mocha = require('gulp-mocha');

function removeDir(dir) {
    fs.readdirSync(dir).forEach(function(name) {
        if (name !== '.' && name !== '..') {
            fs.unlinkSync(dir+ '/' + name);
        }
    });
    fs.rmdirSync(dir);
}

function removeDirTree(dir) {
    fs.readdirSync(dir).forEach(function(name) {
        if (name !== '.' && name !== '..') {
            removeDir(dir + '/' + name);
        }
    });
}

describe('gulp-coverage', function () {
    var writer, reader;
    beforeEach(function () {
        delete require.cache[require.resolve('../testsupport/test')];
        delete require.cache[require.resolve('../testsupport/src')];
        if (fs.existsSync(process.cwd() + '/.coverdata')) {
            removeDirTree(process.cwd() + '/.coverdata');
        }
        if (fs.existsSync(process.cwd() + '/.coverrun')) {
            fs.unlinkSync(process.cwd() + '/.coverrun');
        }
        writer = through2.obj(function (chunk, enc, cb) {
            this.push(chunk);
            cb();
        }, function (cb) {
            cb();
        });
    });
    describe('instrument', function () {
        it('should instrument and collect data', function (done) {
            reader = through2.obj(function (chunk, enc, cb) {
                this.push(chunk);
                cb();
            },
            function (cb) {
                var filename = require.resolve('../testsupport/test');
                // Should have created the coverdata directory
                assert.ok(fs.existsSync(process.cwd() + '/.coverdata'));
                // Should have created the run directory
                assert.ok(fs.existsSync(process.cwd() + '/.coverrun'));
                run = JSON.parse(fs.readFileSync(process.cwd() + '/.coverrun')).run;
                assert.ok(fs.existsSync(process.cwd() + '/.coverdata/' + run));
                // Should have collected data
                dataPath = path.join(process.cwd() + '/.coverdata/' + run, filename.replace(/[\/|\:|\\]/g, "_"));
                assert.ok(fs.existsSync(dataPath));
                cb();
                done();
            });
            reader.on('error', function(){
                console.log('error: ', arguments);
            });

            writer.pipe(cover.instrument({
                pattern: ['**/test*'],
                debugDirectory: process.cwd() + '/debug/'
            }))
                .pipe(mocha({}))
                .pipe(reader);

            writer.push({
                path: require.resolve('../testsupport/src.js')
            });
            writer.end();
        });
        it('should throw if passed a real stream', function(done) {
            writer = through2(function (chunk, enc, cb) {
                this.push(chunk);
                cb();
            }, function (cb) {
                cb();
            });
            writer.pipe(cover.instrument({
                pattern: ['**/test*'],
                debugDirectory: process.cwd() + '/debug/'
            }).on('error', function(err) {
                assert.equal(err.message, 'Streaming not supported');
                done();                
            }));
            writer.write('Some bogus data');
            writer.end();
        });
    });
    describe('report', function () {
        beforeEach(function () {
            if (fs.existsSync('coverage.html')) {
                fs.unlinkSync('coverage.html');
            }
        });
        it('should throw if passed a real stream', function(done) {
            writer = through2(function (chunk, enc, cb) {
                this.push(chunk);
                cb();
            }, function (cb) {
                cb();
            });
            writer.pipe(cover.report({
                outFile: 'coverage.html',
                reporter: 'html'
            }).on('error', function(err) {
                assert.equal(err.message, 'Streaming not supported');
                done();                
            }));
            writer.write('Some bogus data');
            writer.end();
        });
        it('should create an HTML report', function (done) {
            reader = through2.obj(function (chunk, enc, cb) {
                cb();
            },
            function (cb) {
                assert.ok(fs.existsSync('coverage.html'));
                cb();
                done();
            });
            writer.pipe(cover.instrument({
                pattern: ['**/test*'],
                debugDirectory: process.cwd() + '/debug/'
            })).pipe(mocha({
            })).pipe(cover.report({
                outFile: 'coverage.html',
                reporter: 'html'
            })).pipe(reader);

            writer.write({
                path: require.resolve('../testsupport/src.js')
            });
            writer.end();
        });
        it('will send the coverage data through as a JSON structure', function (done) {
            reader = through2.obj(function (data, enc, cb) {
                assert.ok(data.coverage);
                assert.equal('number', typeof data.coverage.coverage);
                assert.equal('number', typeof data.coverage.statements);
                assert.equal('number', typeof data.coverage.blocks);
                assert.ok(Array.isArray(data.coverage.files));
                assert.equal(data.coverage.files[0].basename, 'test.js');
                cb();
            },
            function (cb) {
                cb();
                done();
            });
            writer.pipe(cover.instrument({
                pattern: ['**/test*'],
                debugDirectory: process.cwd() + '/debug/'
            })).pipe(mocha({
            })).pipe(cover.report({
                outFile: 'coverage.html',
                reporter: 'html'
            })).pipe(reader);
            writer.write({
                path: require.resolve('../testsupport/src.js')
            });
            writer.end();
        });
    });
    describe('gather', function () {
        it('should throw if passed a real stream', function(done) {
            writer = through2(function (chunk, enc, cb) {
                this.push(chunk);
                cb();
            }, function (cb) {
                cb();
            });
            writer.pipe(cover.gather().on('error', function(err) {
                assert.equal(err.message, 'Streaming not supported');
                done();                
            }));
            writer.write('Some bogus data');
            writer.end();
        });
        it('will send the coverage data through as a JSON structure', function (done) {
            reader = through2.obj(function (data, enc, cb) {
                assert.ok(data.coverage);
                assert.equal('number', typeof data.coverage.coverage);
                assert.equal('number', typeof data.coverage.statements);
                assert.equal('number', typeof data.coverage.blocks);
                assert.ok(Array.isArray(data.coverage.files));
                assert.equal(data.coverage.files[0].basename, 'test.js');
                cb();
            },
            function (cb) {
                cb();
                done();
            });
            writer.pipe(cover.instrument({
                pattern: ['**/test*'],
                debugDirectory: process.cwd() + '/debug/'
            })).pipe(mocha({
            })).pipe(cover.gather()).pipe(reader);
            writer.write({
                path: require.resolve('../testsupport/src.js')
            });
            writer.end();
        });
    });
    describe('gather', function () {
        it('should throw if not passed the correct data', function(done) {
            writer = through2(function (chunk, enc, cb) {
                this.push(chunk);
                cb();
            }, function (cb) {
                cb();
            });
            writer.pipe(cover.enforce({}).on('error', function(err) {
                assert.equal(err.message, 'Must call gather or report before calling enforce');
                done();                
            }));
            writer.write('Some bogus data');
            writer.end();
        });
        it('will emit an error if the statement coverage is below the appropriate threshold', function (done) {
            writer.pipe(cover.enforce({
                statements: 100,
                lines: 1,
                blocks: 1
            }).on('error', function(err) {
                assert.equal(err.message.indexOf('statement coverage of'), 0);
                done();                
            }));
            writer.push({
                coverage: {
                    statements: 99,
                    coverage: 99,
                    blocks: 99
                }
            });
            writer.end();
        });
        it('will emit an error if the line coverage is below the appropriate threshold', function (done) {
            writer.pipe(cover.enforce({
                statements: 1,
                lines: 100,
                blocks: 1
            }).on('error', function(err) {
                assert.equal(err.message.indexOf('line coverage of'), 0);
                done();                
            }));
            writer.push({
                coverage: {
                    statements: 99,
                    coverage: 99,
                    blocks: 99
                }
            });
            writer.end();
        });
        it('will emit an error if the block coverage is below the appropriate threshold', function (done) {
            writer.pipe(cover.enforce({
                statements: 1,
                lines: 1,
                blocks: 100
            }).on('error', function(err) {
                assert.equal(err.message.indexOf('block coverage of'), 0);
                done();                
            }));
            writer.push({
                coverage: {
                    statements: 99,
                    coverage: 99,
                    blocks: 99
                }
            });
            writer.end();
        });
    });
});
