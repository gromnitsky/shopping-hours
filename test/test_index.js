#!/opt/bin/mocha --ui=tdd

'use strict';

let assert = require('assert')
let so = require('..')

let hours = (p) => p.parse().events[0].val.hours

suite('Example', function() {
    setup(function() {
    })

    test('timerange', function() {
	assert.deepEqual({
	    from: {h:9, m:20},
	    to: {h:10, m:1}
	}, so.timerange('9:20-10:01'))

	assert.throws(() => so.timerange('9:20-8:01'), /invalid time range/)
	assert.throws(() => so.timerange('9:20-9:19'), /invalid time range/)
	assert.throws(() => so.timerange('9:20'), /invalid time range/)

	assert.throws(() => so.timerange('1:23:4:56'), /invalid time/)
	assert.throws(() => so.timerange('1:'), /invalid time/)
	assert.throws(() => so.timerange('1'), /invalid time/)
    })

    test('parse_hours_shopping', function() {
	let p = so.parser('-/- 9:00-13:00,14:00-18:00')
	assert.deepEqual([so.timerange('9:00-13:00'),
			  so.timerange('14:00-18:00')],
			 hours(p))
    })

    test('dow_find', function() {
	assert.equal(23, so.dow_find(new Date('2018-01-01'), 11, 'fri', 4))
    })
})
