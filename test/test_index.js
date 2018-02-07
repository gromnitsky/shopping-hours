#!/opt/bin/mocha --ui=tdd

'use strict';

let assert = require('assert')
let util = require('util')
let so = require('..')

let log = function(s) { console.log(util.inspect(s, {depth: null})) }
let s = so.parser
let r = function(input, d) {
    let sh = s(input)
    let p = sh.parse()
    return sh.resolve(d, p)
}
let b = function(input, d) {
    let sh = s(input)
    let p = sh.parse()
    return sh.business(p, d)
}

suite('Example', function() {
//    setup(function() {})

    test('parse failing', function() {
	assert.throws( () => s('foo 0:0-0:0').parse(), /unsupported/)
	assert.throws( () => s('/ 0:0-0:0').parse(), /invalid date/)
	assert.throws( () => s('13/ 0:0-0:0').parse(), /invalid month/)
	assert.throws( () => s('/13 0:0-0:0').parse(), /invalid date/)
	assert.throws( () => s('x/y 0:0-0:0').parse(), /invalid date/)
	assert.throws( () => s('32/ 0:0-0:0').parse(), /invalid date/)
	assert.throws( () => s('31/13 0:0-0:0').parse(), /invalid month/)
	assert.throws( () => s('zzz.last/12 0:0-0:0').parse(), /invalid date/)
	assert.throws( () => s('fri.-2/12 0:0-0:0').parse(), /invalid date/)

	assert.throws( () => s('1/1').parse(), /invalid time range/)
	assert.throws( () => s('1/1 0:0').parse(), /invalid time range/)
	assert.throws( () => s('1/1 20:40-19:40').parse(), /invalid time range/)
	assert.throws( () => s('1/1 25:40-19:40').parse(), /invalid time/)
	assert.throws( () => s('1/1 25:40:40-19:40').parse(), /invalid time/)
	assert.throws( () => s('1/1 -').parse(), /invalid time/)
    })

    test('parse', function() {
	assert.deepEqual({
	    vars: {},
	    events:
	    [ { line: 1,
		val:
		{ cd: { date: '-', month: '-' },
		  hours:
		  [ { from: { h: 9, m: 0 }, to: { h: 13, m: 0 } },
		    { from: { h: 14, m: 0 }, to: { h: 18, m: 0 } } ],
		  flags: '-',
		  desc: '' } } ] }, s('-/- 9:00-13:00,14:00-18:00').parse())
    })

    test('dow_find', function() {
	assert(r('fri.4/11 :-:', '2018-01').events['23/11'])
    })

    test('dow', function() {
	assert.deepEqual({
	    vars: { 'double-holiday-if-saturday':
		    { line: 1, val: 'true' } },
	    events:
	    { '8/1':
	      { line: 3,
		val:
		{ hours: [ { from: { h: 12, m: 0 }, to: { h: 15, m: 0 } } ],
		  flags: 'og',
		  desc: '' } },
	      '7/1':
	      { line: 3,
		val:
		{ hours: [ { from: { h: 12, m: 0 }, to: { h: 15, m: 0 } } ],
		  flags: 'o',
		  desc: '' } },
	      '14/1':
	      { line: 4,
		val:
		{ hours: [ { from: { h: 0, m: 0 }, to: { h: 0, m: 0 } } ],
		  flags: '-',
		  desc: '' } } } },
			 r(`double-holiday-if-saturday=true
-/- 9:00-13:00,14:00-18:00
7/1 12:-15: o
sun/- :-:`, '2018-01-08')) // mon
    })

    test('loop', function() {
	assert.deepEqual({ status: 'closed', next: null },
			 b('-/- :-:\n2/1 :-: o', '2018-01'))
	assert.deepEqual({ status: 'closed', next: null },
			 b('-/- :-:', '2018-01'))
    })
})
