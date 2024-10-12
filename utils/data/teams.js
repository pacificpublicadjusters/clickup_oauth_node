const employeeIds = [
  {
    id: 1,
    name: "Christopher Castanuela",
    email: "christopher@pacificpa.claims",
  },
  {
    id: 2,
    name: "Amanda Collins",
    email: "team4@pacificpa.claims",
  },
  {
    id: 3,
    name: "Andrea Robles",
    email: "andrea@pacificpa.claims",
  },
  {
    id: 4,
    name: "Andres Robles",
    email: "andrew@pacificpa.claims",
  },
  {
    id: 5,
    name: "Clint Wooley",
    email: "clintwooley@gmail.com",
  },
  {
    id: 6,
    name: "John Paul Fernandez",
    email: "johnpaul@pacificpa.claims",
  },
  {
    id: 7,
    name: "Mark Stockwell",
    email: "mark@pacificpa.claims",
  },
  {
    id: 8,
    name: "Mollie Babb",
    email: "mollie.babb@phaserservices.com",
  },
  {
    id: 9,
    name: "Pacific PA Support",
    email: "support@pacificpa.claims",
  },
  {
    id: 10,
    name: "Taylor Babb",
    email: "taylor@pacificpa.claims",
  },
  {
    id: 11,
    name: "Tom Glenn",
    email: "tom@phaserservices.com",
  },
];

const teams = [
  {
    number: "+13605486904",
    team: "Primary - Mark Stockwell",
    employeeIds: [6],
  },
  {
    number: "+13602051515",
    team: "A2 Solutions",
    employeeIds: [3, 4, 9, 10],
  },
  {
    number: "+12062222708",
    team: "Primary - Clint Wooley",
    employeeIds: [5],
  },
  {
    number: "+14052974831",
    team: "Meth Alarm Oklahoma",
    employeeIds: [8, 10],
  },
  {
    number: "+13603024068",
    team: "Primary - Amanda Collins",
    employeeIds: [2],
  },
  {
    number: "+12066729240",
    team: "PMZ Collaterals",
    employeeIds: [3, 4, 10, 6, 9],
  },
  {
    number: "+14258000411",
    team: "Dorothy Leads",
    employeeIds: [10, 7, 2, 3, 4, 5, 6, 9],
  },
  {
    number: "+14258000411",
    team: "New Clients",
    employeeIds: [10, 2, 4, 5, 6, 9],
  },
  {
    number: "+14252306333",
    team: "Meth Alarm",
    employeeIds: [10, 7, 11],
  },
  {
    number: "+15092603923",
    team: "Primary - John Paul Fernandez",
    employeeIds: [6],
  },
  {
    number: "+13603028654",
    team: "Recorded Line Team 4",
    employeeIds: [10, 2, 3, 4, 5],
  },
  {
    number: "+16232541114",
    team: "Primary - Tom Glenn",
    employeeIds: [11],
  },
  {
    number: "+1360217041",
    team: "Client Line Team 4",
    employeeIds: [10, 2, 3, 4, 5],
  },
  {
    number: "+12062030223",
    team: "Big Lead Machine",
    employeeIds: [11],
  },
];

module.exports = { employeeIds, teams };
