#!/opt/bin/mocha --ui=tdd

'use strict';

let assert = require('assert')
let util = require('util')
let sh = require('..')

let log = function(s) { console.log(util.inspect(s, {depth: null})) }
let r = function(input, d) {
    let s = sh(input)
    return s.resolve(d, s.parsed_input)
}
let b = function(input, d) {
    return sh(input).business(d)
}

suite('Example', function() {
//    setup(function() {})

    test('parse failing', function() {
	assert.throws( () => sh('foo 0:0-0:0'), /unsupported/)
	assert.throws( () => sh('/ 0:0-0:0'), /invalid date/)
	assert.throws( () => sh('13/ 0:0-0:0'), /invalid month/)
	assert.throws( () => sh('/13 0:0-0:0'), /invalid date/)
	assert.throws( () => sh('x/y 0:0-0:0'), /invalid date/)
	assert.throws( () => sh('32/ 0:0-0:0'), /invalid date/)
	assert.throws( () => sh('31/13 0:0-0:0'), /invalid month/)
	assert.throws( () => sh('zzz.last/12 0:0-0:0'), /invalid date/)
	assert.throws( () => sh('fri.-2/12 0:0-0:0'), /invalid date/)

	assert.throws( () => sh('1/1'), /invalid time range/)
	assert.throws( () => sh('1/1 0:0'), /invalid time range/)
	assert.throws( () => sh('1/1 20:40-19:40'), /invalid time range/)
	assert.throws( () => sh('1/1 25:40-19:40'), /invalid time/)
	assert.throws( () => sh('1/1 25:40:40-19:40'), /invalid time/)
	assert.throws( () => sh('1/1 -'), /invalid time/)
    })

    test('parse', function() {
	assert.deepEqual({ vars: {}, events: [] }, sh().parsed_input)

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
		  desc: '' } } ] }, sh('-/- 9:00-13:00,14:00-18:00').parsed_input)
    })

    test('resolve empty', function() {
	assert.deepEqual({ vars: {}, events: [] }, r())
    })

    test('dow_find', function() {
	assert(r('fri.4/11 :-:', '2018-01').events['23/11'])
    })

    test('dow', function() {
	let r1 = r(`auto-move-holidays=true
-/- 9:00-13:00,14:00-18:00
7/1 12:-15: o
sun/- :-:`, '2018-01-08')	// mon
//	log(r1)
	assert.deepEqual({
	    vars: { 'auto-move-holidays':
		    { line: 1, val: 'true' } },
	    events:
	    { '8/1':
	      { line: 3,
		val:
		{ hours: [ { from: { h: 12, m: 0 }, to: { h: 15, m: 0 } } ],
		  flags: 'oO',
		  desc: '' } },
	      '14/1':
	      { line: 4,
		val:
		{ hours: [ { from: { h: 0, m: 0 }, to: { h: 0, m: 0 } } ],
		  flags: '-',
		  desc: '' } } } }, r1)
    })

    test('loop', function() {
	assert.deepEqual({ status: 'closed', next: null },
			 b('-/- :-:\n2/1 :-: o', '2018-01'))
	assert.deepEqual({ status: 'closed', next: null },
			 b('-/- :-:', '2018-01'))
    })

    test('several weeks of festivities', function() {
	let cal = `
-/- 9:00-13:00,14:00-18:00
1/1 :-: o
2/1 :-: o
3/1 :-: o
4/1 :-: o
5/1 :-: o
8/1 :-: o
9/1 :-: o
10/1 :-: o
11/1 :-: o
12/1 :-: o
#13/1
#14/1
sat/- 10:10-15:00
sun/- :-:

6/1 :-: o
7/1 :-: o
`
//	log(r(cal, '2018-01'))
	assert.deepEqual({ status: 'closed',
			   next: new Date('2018-01-13T08:10:00.000Z') },
			 b(cal, '2018-01'))
    })

    test('plugin easter', function() {
	let cal = 'pentecost_orthodox :-:'
	let p = sh(cal).parsed_input
	assert.deepEqual({ date: 'pentecost_orthodox', month: null },
			 p.events[0].val.cd)

//	console.log(r(cal, '2018-01'))
	assert(r(cal, '2018-01').events['27/5'])
	assert(r('easter_catholic :-:', '2019-01').events['21/4'])
    })

    test('business failing', function() {
	assert.throws( () => b('1/1 :-:', '2018-02-01'), /no default entry/)
	assert.throws( () => b(`
sat/- 11:00-16:00
sun/- :-:`, '2018-02-10 18:01'), /no default entry/)
    })

    test('weekday_next', function() {
	let cal = `-/- 9:00-13:00,14:00-18:00
sat/- :-:
sun/- :-:`
	assert(r(cal, '2018-01-24').events['27/1'])
	assert(r(cal, '2018-01-24').events['28/1'])

	assert(r(cal, '2018-01-31').events['3/2'])
	assert(r(cal, '2018-01-31').events['4/2'])
    })

    test('auto-moved-holidays', function() {
	let cal1 = `-/- 9:00-18:00
1/9 :-: o first
2/9 :-: o second
sat/- :-: - sat
sun/- :-: - sun
auto-move-holidays = true`
	let r1 = r(cal1, '2018-09-01')
	assert.deepEqual({
	    vars: { 'auto-move-holidays': { line: 6, val: 'true' } },
	    events:
	    { '1/9':
	      { line: 4,
		val:
		{ hours: [ { from: { h: 0, m: 0 }, to: { h: 0, m: 0 } } ],
		  flags: '-',
		  desc: 'sat' } },
	      '3/9':
	      { line: 2,
		val:
		{ hours: [ { from: { h: 0, m: 0 }, to: { h: 0, m: 0 } } ],
		  flags: 'oO',
		  desc: 'first' } },
	      '4/9':
	      { line: 3,
		val:
		{ hours: [ { from: { h: 0, m: 0 }, to: { h: 0, m: 0 } } ],
		  flags: 'oO',
		  desc: 'second' } },
	      '2/9':
	      { line: 5,
		val:
		{ hours: [ { from: { h: 0, m: 0 }, to: { h: 0, m: 0 } } ],
		  flags: '-',
		  desc: 'sun' } } } }, r1)

	let cal2 = `-/- 9:00-18:00
1/9 :-: o first
2/9 :-: o second
sat/- :-: - sat
sun/- :-: - sun
3/9 10:00-12:00 a short day
auto-move-holidays = true`
	let r2 = r(cal2, '2018-08-31')
	assert.deepEqual(
	    { '31/8':
	      { line: 1,
		val:
		{ hours: [ { from: { h: 9, m: 0 }, to: { h: 18, m: 0 } } ],
		  flags: '-',
		  desc: '' } },
	      '3/9':
	      { line: 6,
		val:
		{ hours: [ { from: { h: 10, m: 0 }, to: { h: 12, m: 0 } } ],
		  flags: 'a',
		  desc: 'short day' } },
	      '4/9':
	      { line: 3,
		val:
		{ hours: [ { from: { h: 0, m: 0 }, to: { h: 0, m: 0 } } ],
		  flags: 'oO',
		  desc: 'second' } },
	      '1/9':
	      { line: 4,
		val:
		{ hours: [ { from: { h: 0, m: 0 }, to: { h: 0, m: 0 } } ],
		  flags: '-',
		  desc: 'sat' } },
	      '2/9':
	      { line: 5,
		val:
		{ hours: [ { from: { h: 0, m: 0 }, to: { h: 0, m: 0 } } ],
		  flags: '-',
		  desc: 'sun' } } }, r2.events)
    })
})
