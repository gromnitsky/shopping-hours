'use strict';

class ParseError extends Error {
    constructor(line, msg) {
	super(`line ${line}: ${msg}`)
    }
}

let dow_validate = function(t) {
    return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(t) !== -1
}

exports.parser = function(input, opt) {
    opt = opt || {}
    let today = () => new Date(opt.today || new Date())

    // return local day of the month
    let dow_find = function(/* human */month, dow, week_num) {
	let d = new Date(today())
	d.setMonth(month-1)
	let dow2js = { 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4,
		       'fri': 5, 'sat': 6, 'sun': 0 }
	let counter = 0
	let last
	for (let day = 1; d.getMonth()+1 === month; ++day) {
	    d.setDate(day)
	    if (d.getDay() === dow2js[dow]) {
		last = d.getDate()
		counter++
	    }
	    if (counter === week_num) return d.getDate()
	}
	return week_num === -1 ? last : -1
    }

    let parse_date = function(line, val) {
	let mnorm = (str) => {
	    if (str === '-') return str
	    let n = Number(str)
	    if (isNaN(n) || n < 1 || n > 12)
		throw new ParseError(line, `invalid month: ${str}`)
	    return n
	}
	let dnorm = (month, str) => {
	    if (str === '-') return str

	    let error = new ParseError(line, `invalid day: ${str}`)
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
		let dow = dow_find(month, d, week)
		if (dow === -1) throw error
		return dow
	    }
	    if (n < 1 || n > 31) throw error
	    return n
	}

	if (val.indexOf('/') === -1) {
	    // FIXME
	    throw new ParseError(line, `${val} is unsupported`)
	}
	let [day, month] = val.split('/')
	month = mnorm(month)
	return { day: dnorm(month, day), month }
    }

    let parse_hours_out_of = function(line, val) {
	return val
    }

    let parse_hours_shopping = function(line, val) {
	return val
    }

    let parse = function() {
	let r = {
	    vars: {},
	    events: []
	}
	input.split(/\n/).forEach( (row, line) => {
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
		    date: parse_date(line, cols[0]),
			hours: {
			    out_of: parse_hours_out_of(line, cols[1]),
			    shopping: parse_hours_shopping(line, cols[1])
			},
			flags: cols[2] || '-',
			desc: cols.slice(3).join(' ')
		    }
		})
	    }
	})
	return r
    }

    return {parse}
}

if (__filename === process.argv[1]) {
    let fs = require('fs')
    let util = require('util')
    let parser = exports.parser(fs.readFileSync(process.argv[2]).toString())
    console.log(util.inspect(parser.parse(), {depth: null}))
}
