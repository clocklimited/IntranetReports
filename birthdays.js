
const { Client } = require('pg')
const moment = require('moment')
const camelCase = require('lodash.camelcase')
const sortby = require('lodash.sortby')
const { getSign } = require('horoscope')
const name = require('emoji-name-map')


const months = process.env.MONTHS || 12

const client = new Client()

const formatRow = row => {
  row.age = moment().diff(row.dateOfBirth, 'years')
  return row
}

const format = ({ date, key, prefix = '-', sign}) => employee => {
  const employeeDate = moment(employee[key])
  const anniversary = moment(date).endOf('month').diff(employeeDate, 'years')
  if (sign) {
    sign = name.get(getSign({ month: employeeDate.month() + 1, day: employeeDate.date() }).toLowerCase())
  }
  return ` ${prefix}  ${employee.firstName} ${employee.lastName} - ${anniversary} years - ${employeeDate.format('D MMMM YYYY')} ${sign || ''}`
}

const filterMonth = (employees, date, key) =>
  sortby(employees
  .filter(employee => moment(employee[key]).month() === date.month())
  .map(employee => {
    employee.day = moment(employee[key]).date()
    return employee
  }), 'day')

const exclude = [ 210, 28, 29 ]


const go = async () => {
  await client.connect()
  const query = `SELECT "Employees"."Id", "Contacts"."FirstName", "Contacts"."LastName", "Contacts"."DateOfBirth", "Employees"."DateOfEmployement", "Employees"."LeavingDate" FROM "Employees" LEFT JOIN "Contacts" ON "Contacts"."Id" = "Employees"."ContactId" WHERE ("LeavingDate" IS NULL OR "LeavingDate" > now())`
  const res = await client.query(query)

  const employees = res.rows.filter(employee => !exclude.includes(Number(employee.Id))).map(row => Object.keys(row).reduce((employee, key) => {
      employee[camelCase(key)] = row[key]
      return employee
    }, {}))

  console.log(employees.map(({ id, firstName, lastName }) => `${firstName} ${lastName} - https://intranet.clock.uk/employees/control.php?Submit=Edit&Id=${id}`).sort().join('\n'))

  let date = moment().add(-1, 'month').startOf('month')
  for (let i = 0; i < months; i++) {
    const start = date
    const end = date.endOf('month')
    const birthdays = filterMonth(employees, start, 'dateOfBirth')
    const clockBirthdays = filterMonth(employees, start, 'dateOfEmployement')

    console.log(start.format('MMMM YYYY'))

    console.log('\nBirthdays')
    console.log(birthdays.map(format({ date: start, key: 'dateOfBirth', prefix: '🎂', sign: true })).join('\n'))

    console.log('\nClock Birthdays')
    console.log(clockBirthdays.map(format({ date: start, key: 'dateOfEmployement', prefix: '⏰' })).join('\n'))

    console.log('\n')
    date = date.add(1, 'month')
  }

  await client.end()
}

go()
