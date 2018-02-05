'use strict';

class ParseError extends Error {
    constructor(line, msg) {
	super(`line ${line}: ${msg}`)
    }
}

let parse_date = function(line, val) {
    let mnorm = (str) => {
	if (str === '-') return str
	let n = Number(str)
	if (isNaN(n) || n < 1 || n > 12) throw new ParseError(line, `invalid month: ${str}`)
	return n
    }
    let dnorm = (str) => {
	if (str === '-') return str

	let error = new ParseError(line, `invalid day: ${str}`)
	str = str.toLowerCase()
	let n = Number(str)
	if (isNaN(n)) {
	    let dow = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
	    if (str.indexOf('.') === -1) {
		if (dow.indexOf(str) === -1) throw error
		return str
	    }
	    let [d, week] = str.split('.')
	    if (dow.indexOf(d) === -1) throw error
	    if (week === 'last') week = -1
	    week = Number(week)
	    if (isNaN(week) || week < -1 || week === 0 || week > 5) throw error
	    // todo
	}
	if (n < 1 || n > 31) throw error
	return n
    }

    if (val.indexOf('/') === -1) {
	// FIXME
	throw new ParseError(line, `${val} is unsupported`)
    }
    let [day, month] = val.split('/')
    return { day: dnorm(day), month: mnorm(month) }
}

let parse_hours_out_of = function(line, val) {
    return val
}

let parse_hours_shopping = function(line, val) {
    return val
}

exports.parse = function(str, opt) {
    opt = opt || {}
    let r = {
	vars: {},
	events: []
    }
    let today = new Date(opt.today || new Date())
    str.split(/\n/).forEach( (row, line) => {
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

if (__filename === process.argv[1]) {
    let fs = require('fs')
    let util = require('util')
    console.log(util.inspect(exports.parse(fs.readFileSync(process.argv[2]).toString()), {depth: null}))
}
