'use strict';

class ParseError extends Error {
    constructor(line, msg) {
	super(`line ${line}: ${msg}`)
    }
}

let dow_validate = function(t) {
    return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(t) !== -1
}

let dow2num = { 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0 }
let num2dow = Object.assign({}, ...Object.entries(dow2num).map(([a,b]) => ({ [b]: a })))

let dup = function(o) {
    return JSON.parse(JSON.stringify(o))
}

exports.parser = function(input, opt) {
    opt = opt || {}
    let today = () => new Date(opt.today || new Date())

    let parse_date = function(line, val) {
	let mnorm = (str) => {
	    if (str === '-') return str
	    let n = Number(str)
	    if (isNaN(n) || n < 1 || n > 12)
		throw new ParseError(line, `invalid month: ${str}`)
	    return n
	}
	let dnorm = (str) => {
	    if (str === '-') return str

	    let error = new ParseError(line, `invalid date: ${str}`)
	    str = str.toLowerCase()
	    let n = Number(str)
	    if (isNaN(n)) {
		if (str.indexOf('.') === -1) {
		    if (!dow_validate(str)) throw error
		    return str
		}
		let [d, week] = str.split('.')
		if (!dow_validate(d)) throw error
		if (week === 'last') week = -1
		week = Number(week)
		if (isNaN(week) || week < -1 || week === 0 || week > 6) throw error
		return str
	    }
	    if (n < 1 || n > 31) throw error
	    return n
	}

	if (val.indexOf('/') === -1) {
	    // FIXME
	    throw new ParseError(line, `${val} is unsupported`)
	}
	let [date, month] = val.split('/')
	return { date: dnorm(date), month: mnorm(month) }
    }

    let parse_hours_shopping = function(line, val) {
	return val.split(',').map( v => {
	    try {
		return exports.timerange(v)
	    } catch (e) { throw new ParseError(line, e.message) }
	})
    }

    let parse = function() {
	let r = {
	    vars: {},
	    events: []
	}
	input.split(/\n/).forEach( (row, line) => {
	    line++
	    let m
	    if ( (m = row.match(/^\s*([a-zA-Z0-9-_]+)\s*=\s*(.*)/))) {
		// var assignment
		r.vars[m[1]] = { line, val: m[2] }
	    } else if (/^\s*$/.test(row)) {
		// empty line
	    } else if (/^\s*#/.test(row)) {
		// comment
	    } else {
		let cols = row.split(/\s+/)
		r.events.push({
		    line, val: {
			cd: parse_date(line, cols[0]),
			hours: parse_hours_shopping(line, cols[1]),
			flags: cols[2] || '-',
			desc: cols.slice(3).join(' ')
		    }
		})
	    }
	})
	return r
    }

    // resolve all the dates in pdata, e.g., fri.4/11 becomes 23/11
    let resolve = function(pdata) {
	let variable = (name) => pdata.vars[name].val
	let now = today()

	let r = { vars: pdata.vars, events: {/* we are filling it */} }
	pdata.events.forEach( evt => {
	    let flag = (v) => evt.val.flags.indexOf(v) !== -1

	    let cd = evt.val.cd
	    let month = cd.month === '-' ? now.getMonth() + 1 : cd.month
	    let date = cd.date
	    if (isNaN(Number(date))) {
		if (date === '-') {
		    date = now.getDate()
		} else if (date.indexOf('.') !== -1) { // thu.last
		    let [dow, week] = date.split('.')
		    date = exports.dow_find(now, month, dow, Number(week))
		} else if (/^sat|sun$/.test(date)) {
		    date = exports.weekday_next(now, month, date)
		} else {
		    // FIXME
		    throw new ParseError(evt.line, `${date} is unsupported`)
		}
	    }

	    // add a new resolved event
	    let event_key = `${date}/${month}`
	    let event_data = dup(evt)
	    delete event_data.val.cd
	    r.events[event_key] = event_data

	    if (variable('double-holiday-if-saturday') === 'true'
		&& flag('o')
		&& exports.dow(now, month, date) === 'sun') {
		let d = exports.date_next(now, month, date+1)
		let holiday = `${d.getDate()}/${d.getMonth()+1}`
		r.events[holiday] = dup(event_data) // copy to the cur event
		r.events[holiday].val.flags += 'g' // mark as 'generated'
	    }
	})
	return r
    }

    return {parse, resolve}
}

exports.date_next = function(today, /* human */month, date) {
    let d = new Date(today)
    d.setMonth(month-1)
    d.setDate(date)
    return d
}

exports.dow = function(today, /* human */month, date) {
    return num2dow[exports.date_next(today, month, date).getDay()]
}

// return local day of the month, -1 on error
exports.dow_find = function(today, /* human */month, dow, week_num) {
    let d = new Date(today)
    d.setMonth(month-1)
    let counter = 0
    let last
    for (let date = 1; d.getMonth()+1 === month; ++date) {
	d.setDate(date)
	if (d.getDay() === dow2num[dow]) {
	    last = d.getDate()
	    counter++
	}
	if (counter === week_num) return d.getDate()
    }
    return week_num === -1 ? last : -1
}

exports.weekday_next = function(today, /*human*/month, dow) {
    let d = new Date(today)
    d.setMonth(month-1)
    for (let date = d.getDate(); ; ++date) {
	d.setDate(date)
	if (d.getDay() === dow2num[dow]) return date
    }
    // unreachable
}

exports.time = function(spec) {
    let error = new Error(`invalid time: ${spec}`)
    let arr = spec.split(':')
    if (arr.length !== 2) throw error

    let [h, m] = arr.map( v => {
	let n = Number(v)
	if (isNaN(n) || n < 0) throw error
	return n
    });
    if (h > 23 || h > 59) throw error
    return {h, m}
}

exports.timerange = function(t) {
    let error = new Error(`invalid time range: ${t}`)
    let arr = t.split('-')
    if (arr.length !== 2) throw error

    let [from, to] = arr.map( v => exports.time(v))
    if (from.h > to.h || (from.h === to.h && from.m > to.m)) throw error
    return {from, to}
}

if (__filename === process.argv[1]) {
    let fs = require('fs')
    let util = require('util')
    let parser = exports.parser(fs.readFileSync(process.argv[2]).toString())
    let pdata = parser.parse()
    console.log(util.inspect(pdata, {depth: null}))
    console.log(util.inspect(parser.resolve(pdata), {depth: null}))
}
