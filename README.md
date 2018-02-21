# shopping-hours

A flexible shopping-hours calendar & calculator.

| `dist/*`                | lang  | type | minified |
|-------------------------| ----- | ---- | -------- |
| `shopping_hours.min.js` | es5   | UMD  | x        |
| `shopping_hours.js`     | es6   | UMD  |          |

* ~8.6KB minified.
* Uses a standard JS `Date` object.
* Moveable feasts (Easter & Pentecost).
* User-provided plugins for moveble dates.
* Elastic dates as `fri.4/11` (the 4th Friday of November),
  `wed.last/-`, `sat/-`.
* Returns the current status (open/closed) for any date.
* Automatically calculates the next opening/closing datetime.

Calendar itself is .txt file that uses a simple line-oriented DSL,
e.g.:

~~~
-/-                 9:00-13:00,14:00-18:00
1/1                 0:0-0:0                   o   new year
easter_orthodox     0:0-0:0                   o
fri.4/11            6:30-23:00                -   black friday
sun/-               0:0-0:0
~~~

## Why?

TODO (explain how UA online stores work)

## Quick Start

	$ npm i shopping-hours

Create a simple calendar:

~~~
$ node
> sh = require('shopping-hours')
[Function: shopping_hours]
> cal = `-/- 9:00-13:00,14:00-18:00
... sat/- 11:00-16:00
... sun/- :-:`
'-/- 9:00-13:00,14:00-18:00\nsat/- 11:00-16:00\nsun/- :-:'
~~~

Next, parse the cal:

~~~
> my_shop = sh(cal)
{ parsed_input: { vars: {}, events: [ [Object], [Object], [Object] ] },
  parse: [Function: parse],
  resolve: [Function: resolve],
  business: [Function: business] }
~~~

The fn of interest here is `#business()`. To get the status of our
little online store, pass an optional date to it:

~~~
> my_shop.business('2018-02-08 01:00')
{ status: 'closed', next: 2018-02-08T07:00:00.000Z }
~~~

Because it resolves the cal for 1am, it says that the shop is
'closed', & 'next' key indicates (printed in UTC here; the diff for
`Europe/Kiev` timezone is +2h) when the shop 'opens'.

If we update the time to 9am:

~~~
> my_shop.business('2018-02-08 09:00')
{ status: 'open', next: 2018-02-08T11:00:00.000Z }
~~~

it says, the shop is 'open' & it closes at 1pm for a lunch break.

2018-02-08 is Thursday, if we specify the next day as

~~~
> my_shop.business('2018-02-09 18:01')
{ status: 'closed', next: 2018-02-10T09:00:00.000Z }
~~~

it says the shop is 'closed' & it opens at 11am next day (Saturday).

For Saturday it returns:

~~~
> my_shop.business('2018-02-10 18:01')
{ status: 'closed', next: 2018-02-12T07:00:00.000Z }
~~~

Because we set no working hours for Sundays, it jumps to the next
available date, which in this case is Monday.

## DSL

(See the comprehensive example in `test/calendar1.txt`.)

The DSL is line-oriented. Lines starting w/ `#` or empty lines are
ignored.

There are 2 types of expressions: variable assignments (VA) & event
definitions (ED).

VAs can appear in any order. Their goal is to change a
parsing/resolving/calculating behaviour. The VA syntax is:

	name = value

`value` is preserved verbatim.

EDs syntax is:

	date timeranges flags desc

(`flags` & `desc` are optional.)

EDs are analysed in order of increasing precedence. If you want to
override an ED, add another one to the end of the cal.

`date` has 2 forms: `day/month` or a single word like
`easter_catholic`. The premise of the latter is to allow complex
moving dates. The API allows to add user-defined words.

`month` in `day/month` has 2 forms: a digit or `-` char that is auto
replaced by the cur month.

`day` has 3 forms: a digit, `-` (auto replaced by a cur day) or
`dayOfTheWeek.spec`, where `dayOfTheWeek` is one of mon-sun words &
`spec` is either a digit of a word `last`. E.g., `fri.4` means the 4th
Friday of the month, `mon.last` -- the last Monday.

`timeranges` ('working hours') are a list of `HH:MM-HH:MM` pairs
separated by commas. E.g.. `9:00-13:00,14:00-18:00` (or even just
`:-:`, where missing digits are auto substituted by 0s). An empty
range `0:0-0:0` means there are no working hours for the day.

`flags` is a string, in which each char means smthg to the
resolver. `o` is should be used for the 'official' gov holidays, `-`
for any other event. No flag == `-`. Regular sat/sun EDs should *not*
use the `o` flag.

`desc` is an arbitrary string. If you have a `desc` don't forget about
the `flags`.

A suggested order of EDs:

~~~
# a requried default event, when no other dates match
-/- 9:00-18:00
# a specific date
24/8 :-: o Independence Day
# a regular weekend
sat/- 10:30-17:00
sun/- :-:
~~~

### Supported variables

`auto-move-holidays = true` turns on the auto moving of the 'official'
holidays (marked w/ the `o` flag) to the next working day when they
fall on a Sat or Sun.

## API

TODO

## License

MIT.
