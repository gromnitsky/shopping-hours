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

let time = function(spec) {
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

let timerange = function(t) {
    let error = new Error(`invalid time range: ${t}`)
    let arr = t.split('-')
    if (arr.length !== 2) throw error

    let [from, to] = arr.map( v => time(v))
    if (from.h > to.h || (from.h === to.h && from.m > to.m)) throw error
    return {from, to}
}

let date2dm = function(d) {
    return `${d.getDate()}/${d.getMonth()+1}`
}

let getdate = function(today, /* human */month, date) {
    let d = new Date(today)
    d.setMonth(month - 1, 1)
    d.setDate(date)
    return d
}

let dow = function(today, /* human */month, date) {
    return num2dow[getdate(today, month, date).getDay()]
}

let is_weekday = function(today, /* human */month, date) {
    let s = month !== undefined ? dow(today, month, date) : num2dow[today.getDay()]
    return /^(sat|sun)$/.test(s)
}

// return local day of the month, -1 on error
let dow_find = function(today, /* human */month, dow, week_num) {
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

let weekday_next = function(today, /*human*/month, dow) {
    let d = new Date(today)
    d.setMonth(month-1)
    while (d.getDay() !== dow2num[dow])
	d.setDate(d.getDate() + 1)
    return [d.getDate(), d.getMonth()+1]
}

let date_next = function(today, /* human */month, date) {
    return getdate(today, month || today.getMonth() + 1,
		   (date || today.getDate()) + 1)
}

let flag = function(event, flag_name) {
    return event.val.flags.indexOf(flag_name) !== -1
}

let working_day_next = function(cal_resolved, today, month, date) {
    let d = getdate(today, month, date)
    while (is_weekday(d))
	d.setDate(d.getDate() + 1)

    let evt = cal_resolved.events[date2dm(d)]
    if (evt && flag(evt, 'O')) {
	// this day is already filled by a some auto-moved event, try
	// for another one starting from tomorrow
	return working_day_next(cal_resolved, d, d.getMonth()+1, d.getDate()+1)
    }
    return d
}

let plugin_easter = function(today) {
    let easter = require('date-easter')

    let my_easter = function(type) {
	let e = easter[type](today)
	return new Date(e.year, e.month-1, e.day)
    }

    let my_pentecost = function(type) {
	let d = my_easter(type)
	d.setDate(d.getDate() + 49)
	return d
    }

    return {
	easter_catholic: () => { return my_easter('gregorianEaster') },
	pentecost_catholic: () => { return my_pentecost('gregorianEaster') },
	easter_orthodox: () => { return my_easter('orthodoxEaster') },
	pentecost_orthodox: () => { return my_pentecost('orthodoxEaster') }
    }
}

let shopping_hours = function(input = '', opt) {
    opt = opt || { plugins: [] }
    opt.plugins.push(plugin_easter)

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
	    if (opt.plugins.every( p => !p()[val]))
		throw new ParseError(line, `${val} is unsupported`)
	    return { date: val, month: null }
	}
	let [date, month] = val.split('/')
	return { date: dnorm(date), month: mnorm(month) }
    }

    let parse_hours_shopping = function(line, val) {
	return (val || '').split(',').map( v => {
	    try {
		return timerange(v)
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

    let parsed_input = parse()

    let resolve_date_via_plugins = function(today, spec) {
	for (let p of opt.plugins) {
	    let func = p(today)[spec]
	    if (func) {
		let val = func(); // must return a usual Date obj
		return [val.getDate(), val.getMonth()+1]
	    }
	}
	// parser should have caught this
	//throw new Error(`no plugin can resolve ${spec}`)
    }

    // resolve all the dates in pdata, e.g., fri.4/11 becomes 23/11
    let resolve = function(today, pdata) {
	let variable = (name) => pdata.vars[name] && pdata.vars[name].val
	let now = new Date(today || new Date())

	let r = { vars: pdata.vars, events: {/* we are filling it */} }
	pdata.events.forEach( evt => {
	    let {month, date} = evt.val.cd
	    if (month === '-') month = now.getMonth() + 1
	    if (isNaN(Number(date))) {
		if (date === '-') {
		    date = now.getDate()
		} else if (date.indexOf('.') !== -1) { // thu.last
		    let [dow, week] = date.split('.')
		    date = dow_find(now, month, dow, Number(week))
		} else if (/^sat|sun$/.test(date)) {
		    [date, month] = weekday_next(now, month, date)
		} else {
		    [date, month] = resolve_date_via_plugins(now, date)
		}
	    }

	    // create a new resolved event
	    let event_data = dup(evt)
	    delete event_data.val.cd

	    let dm = `${date}/${month}`
	    if (variable('auto-move-holidays') === 'true'
		&& flag(evt, 'o')
		&& is_weekday(now, month, date)) {
		// auto-move this 'official' holiday
		let holiday = date2dm(working_day_next(r, now, month, date))
		r.events[holiday] = event_data
		r.events[holiday].val.flags += 'O' // mark as auto-moved
	    } else {
		r.events[dm] = event_data
	    }
	})
	return r
    }

    let business = function(today, pdata = parsed_input) {
	let cal = resolve(today, pdata)
	let now = new Date(today || new Date())
	let dm = date2dm(now)
	let entry = cal.events[dm]
	let error_no_def = new Error('no default entry in calendar')
	if (!entry) throw error_no_def

	for (let range of entry.val.hours) {
	    let start = new Date(now).setHours(range.from.h, range.from.m, 0)
	    if (start > now) return { // smth like a lunch break
		status: 'closed',
		next: new Date(start) // opens at
	    }
	    let end = new Date(now).setHours(range.to.h, range.to.m, 0)
	    if (now >= start && now <= end) return {
		status: 'open',
		next: new Date(end) // closes at
	    }
	}

	let tomorrow, started_from
	while (1) {
	    tomorrow = date_next(now)
	    if (date2dm(tomorrow) === started_from) { // a defective calendar
		tomorrow = null	// a store never opens!
		break
	    }
	    if (!started_from) started_from = date2dm(tomorrow)

	    cal = resolve(tomorrow, pdata)
	    let events = cal.events[date2dm(tomorrow)]
	    if (!events) throw error_no_def
	    let range = events.val.hours
	    if ( !(range[0].from.h === range[0].to.h
		   && range[0].from.m === range[0].to.m)) {
		tomorrow.setHours(range[0].from.h, range[0].from.m, 0)
		break
	    } else {
		now = tomorrow
	    }
	}
	return {
	    status: 'closed',
	    next: tomorrow	// opens at
	}
    }

    return {parsed_input, parse, resolve, business}
}

module.exports = shopping_hours
