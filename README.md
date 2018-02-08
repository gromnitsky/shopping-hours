# shopping-hours

A flexible shopping-hours calendar & calculator.

| `dist/*`                | lang  | type | minified |
|-------------------------| ----- | ---- | -------- |
| `shopping_hours.min.js` | es5   | UMD  | x        |
| `shopping_hours.js`     | es6   | UMD  |          |

* ~8KB minified.
* Uses a standard JS `Date` object.
* Moveable feasts (Easter & Pentecost).
* User-provided plugins for moveble dates.
* Elastic dates as `fri.4/11` (the 4th friday in November),
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

~~~
$ cat > calendar.txt
-/- 9:00-13:00,14:00-18:00
sat/- 11:00-16:00
sun/- :-:
^D
~~~

Next, load the cal, parse it & check the status according to the
specified date:

~~~
$ cat > my_shop.js
let fs = require('fs')
let sh = require('shopping-hours')

let cal = fs.readFileSync('calendar.txt').toString()
let my_shop = sh(cal) // returns a hash
let parsed_data = my_shop.parse()

console.log(my_shop.business(parsed_data, /*optional*/ '2018-02-08 01:00'))
^D
~~~

Run it:

~~~
$ node my_shop.js
{ status: 'closed', next: 2018-02-08T07:00:00.000Z }
~~~

Because it resolves the cal for 1am, it says that a shop is 'closed',
& 'next' key indicates (here, printed in UTC) when the shop 'opens'.

If we update the date to 2018-02-08 09:00,

	{ status: 'open', next: 2018-02-08T11:00:00.000Z }

it says, the shop is 'open' & closes for a lunch break at 1pm.

2018-02-08 is Thursday, if we specify the date as '2018-02-09 18:01',

	{ status: 'closed', next: 2018-02-10T09:00:00.000Z }

it says the shop is 'closed' & opens at the next day (Saturday) at
11am.

For '2018-02-10 18:01' (Saturday) it returns:

	{ status: 'closed', next: 2018-02-12T07:00:00.000Z }

Because we set no working hours for Sundays, it jumps to the next
available date, which in this case is Monday.

## DSL

TODO

## API

TODO

## License

MIT.
