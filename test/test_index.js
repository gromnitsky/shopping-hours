#!/opt/bin/mocha --ui=tdd

'use strict';

let assert = require('assert')
let util = require('util')
let sh = require('..')

let log = function(s) { console.log(util.inspect(s, {depth: null})) }
let r = function(input, d) {
    let s = sh(input)
    let p = s.parse()
    return s.resolve(d, p)
}
let b = function(input, d) {
    let s = sh(input)
    let p = s.parse()
    return s.business(p, d)
}

suite('Example', function() {
//    setup(function() {})

    test('parse failing', function() {
	assert.throws( () => sh('foo 0:0-0:0').parse(), /unsupported/)
	assert.throws( () => sh('/ 0:0-0:0').parse(), /invalid date/)
	assert.throws( () => sh('13/ 0:0-0:0').parse(), /invalid month/)
	assert.throws( () => sh('/13 0:0-0:0').parse(), /invalid date/)
	assert.throws( () => sh('x/y 0:0-0:0').parse(), /invalid date/)
	assert.throws( () => sh('32/ 0:0-0:0').parse(), /invalid date/)
	assert.throws( () => sh('31/13 0:0-0:0').parse(), /invalid month/)
	assert.throws( () => sh('zzz.last/12 0:0-0:0').parse(), /invalid date/)
	assert.throws( () => sh('fri.-2/12 0:0-0:0').parse(), /invalid date/)

	assert.throws( () => sh('1/1').parse(), /invalid time range/)
	assert.throws( () => sh('1/1 0:0').parse(), /invalid time range/)
	assert.throws( () => sh('1/1 20:40-19:40').parse(), /invalid time range/)
	assert.throws( () => sh('1/1 25:40-19:40').parse(), /invalid time/)
	assert.throws( () => sh('1/1 25:40:40-19:40').parse(), /invalid time/)
	assert.throws( () => sh('1/1 -').parse(), /invalid time/)
    })

    test('parse', function() {
	assert.deepEqual({ vars: {}, events: [] }, sh().parse())

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
		  desc: '' } } ] }, sh('-/- 9:00-13:00,14:00-18:00').parse())
    })

    test('resolve empty', function() {
	assert.deepEqual({ vars: {}, events: [] }, r())
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
	let p = sh(cal).parse()
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
})
