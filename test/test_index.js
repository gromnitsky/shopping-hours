#!/opt/bin/mocha --ui=tdd

'use strict';

let assert = require('assert')

suite('Example', function() {
    setup(function() {
    })

    test('smoke', function() {
	assert.deepEqual([], [])
    })
})
