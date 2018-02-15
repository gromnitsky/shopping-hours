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

TODO

## API

TODO

## License

MIT.
