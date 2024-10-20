const employeeIds = [
  { name: "Amanda Collins", email: "charterclaimsllc@gmail.com", id: 50510498 },
  { name: "Andrea Robles", email: "andrea@pacificpa.claims", id: 75474107 },
  { name: "Andres Robles", email: "andrew@pacificpa.claims", id: 75472456 },
  {
    name: "Christina Aultman",
    email: "christina@pacificpublicadjusters.com",
    id: 75569668,
  },
  {
    name: "Chris Castanuela",
    email: "christopher@pacificpublicadjusters.com",
    id: 75545185,
  },
  { name: "Chelsea Piel", email: "cpiel@pmzlaw.com", id: 75488393 },
  {
    name: "Clint Wooley",
    email: "clint@pacificpublicadjusters.com",
    id: 50510480,
  },
  { name: "Dan Gordon", email: "dancgordon94@gmail.com", id: 75487654 },
  { name: "Garrett Babb", email: "garrett@pacificpa.claims", id: 75433424 },
  { name: "Henry Mwangi", email: "henry@pacificpa.claims", id: 75457750 },
  { name: "Jesse Froehling", email: "jesse@bastion.law", id: 75432762 },
  { name: "JohnPaul", email: "johnpaul@pacificpa.claims", id: 90173870 },
  { name: "Mark Stockwell", email: "mark@pacificpa.claims", id: 75363521 },
  { name: "Maria A Torres", email: "maria@pacificpa.claims", id: 55536219 },
  {
    name: "Mollie Babb",
    email: "mollie.babb@phaserservices.com",
    id: 75481428,
  },
  {
    name: "Robert D. Bohm",
    email: "rdbohm@premisesinjurylaw.com",
    id: 75380798,
  },
  { name: "Sean Simmons", email: "sean@deconspecialistswa.com", id: 75467833 },
  { name: "Taylor Babb", email: "contact@pacificpa.claims", id: 37683215 },
  { name: "Tom Glenn", email: "tom@phaserservices.com", id: 75481452 },
];

const teams = [
  {
    number: "+13602051515",
    team: "A2 Solutions",
    employeeIds: [75474107, 75472456, 55775373], // Andrea Robles, Andres Robles, Pacific PA Support,
  },
  {
    number: "+12062030223",
    team: "Big Lead Machine",
    employeeIds: [75545185], // Chris Castanuela
  },
  {
    number: "+13602170141",
    team: "Client Line Team 4",
    employeeIds: [50510498, 75474107, 75472456, 50510480], // , Amanda Collins, Andrea Robles, Andres Robles, Clint Wooley
  },
  {
    number: "+12062222708",
    team: "Clint Wooley",
    employeeIds: [50510480], // Clint Wooley
  },
  {
    number: "+15092603923",
    team: "John Paul Fernandez",
    employeeIds: [90173870], // JohnPaul
  },
  {
    number: "+13603024068",
    team: "Amanda Collins",
    employeeIds: [50510498], // Amanda Collins
  },
  {
    number: "+13605486904",
    team: "Mark Stockwell",
    employeeIds: [75363521], // Mark Stockwell
  },
  {
    number: "+16232541114",
    team: "Tom Glenn",
    employeeIds: [75481452], // Tom Glenn
  },
  {
    number: "+13603028654",
    team: "Recorded Line Team 4",
    employeeIds: [50510498, 75474107, 75472456, 50510480], // , Amanda Collins, Andrea Robles, Andres Robles, Clint Wooley
  },
  {
    number: "+14258000411",
    team: "Dorothy Leads",
    employeeIds: [
      75363521, 50510498, 75474107, 75472456, 50510480, 90173870, 55775373,
    ], // , Mark Stockwell, Amanda Collins, Andrea Robles, Andres Robles, Clint Wooley, JohnPaul, Pacific PA Support
  },
  {
    number: "+14258000411",
    team: "New Clients",
    employeeIds: [50510498, 75472456, 50510480, 90173870, 55775373], // , Amanda Collins, Andres Robles, Clint Wooley, JohnPaul, Pacific PA Support
  },
  {
    number: "+14052974831",
    team: "Meth Alarm Oklahoma",
    employeeIds: [75481428], // Mollie Babb,
  },
  {
    number: "+14252306333",
    team: "Meth Alarm",
    employeeIds: [75363521, 75481452], // , Mark Stockwell, Tom Glenn
  },
  {
    number: "+12066729240",
    team: "PMZ Collaterals",
    employeeIds: [75474107, 75472456, , 90173870, 55775373], // Andrea Robles, Andres Robles, , JohnPaul, Pacific PA Support
  },
  {
    number: "+18885550101",
    team: "automation tests",
    employeeIds: [],
  },
];

module.exports = { employeeIds, teams };

// const teams = [
//   {
//     team: "A2 Solutions",
//     number: "+13602051515",
//     employeeIds: [3, 4, 50510498],
//   },
//   { team: "Big Lead Machine", number: "+12062030223", employeeIds: [11] },
//   {
//     team: "Dorothy Leads",
//     number: "+14258000411",
//     employeeIds: [10, 7, 50510498, 3, 4, 5, 6, 9],
//   },
//   { team: "Meth Alarm", number: "+14252306333", employeeIds: [10, 7, 11] },
//   { team: "Meth Alarm Oklahoma", number: "+14052974831", employeeIds: [8, 10] },
//   {
//     team: "New Clients",
//     number: "+14258000411",
//     employeeIds: [10, 50510498, 4, 5, 6, 9],
//   },
//   {
//     team: "PMZ Collaterals",
//     number: "+12066729240",
//     employeeIds: [3, 4, 10, 6, 9],
//   },
//   {
//     team: "Amanda Collins",
//     number: "+13603024068",
//     employeeIds: [50510498],
//   },
//   { team: "Clint Wooley", number: "+12062222708", employeeIds: [5] },
//   {
//     team: "John Paul Fernandez",
//     number: "+15092603923",
//     employeeIds: [6],
//   },
//   {
//     team: "Mark Stockwell",
//     number: "+13605486904",
//     employeeIds: [6],
//   },
//   {
//     team: "Recorded Line Team 4",
//     number: "+13603028654",
//     employeeIds: [10, 50510498, 3, 4, 5],
//   },
//   {
//     team: "Client Line Team 4",
//     number: "+13602170141",
//     employeeIds: [10, 50510498, 3, 4, 5],
//   },
// ];

// const employeeIds = [
//   {
//     id: 1,
//     name: "Christopher Castanuela",
//     email: "christopher@pacificpa.claims",
//   },
//   {
//     id: 2,
//     name: "Amanda Collins",
//     email: "team4@pacificpa.claims",
//   },
//   {
//     id: 3,
//     name: "Andrea Robles",
//     email: "andrea@pacificpa.claims",
//   },
//   {
//     id: 4,
//     name: "Andres Robles",
//     email: "andrew@pacificpa.claims",
//   },
//   {
//     id: 5,
//     name: "Clint Wooley",
//     email: "clintwooley@gmail.com",
//   },
//   {
//     id: 6,
//     name: "John Paul Fernandez",
//     email: "johnpaul@pacificpa.claims",
//   },
//   {
//     id: 7,
//     name: "Mark Stockwell",
//     email: "mark@pacificpa.claims",
//   },
//   {
//     id: 8,
//     name: "Mollie Babb",
//     email: "mollie.babb@phaserservices.com",
//   },
//   {
//     id: 9,
//     name: "Pacific PA Support",
//     email: "support@pacificpa.claims",
//   },
//   {
//     id: 10,
//     name: "Taylor Babb",
//     email: "taylor@pacificpa.claims",
//   },
//   {
//     id: 11,
//     name: "Tom Glenn",
//     email: "tom@phaserservices.com",
//   },
// ];

// const clickupMembers = [
//   {
//     user: {
//       id: 75569668,
//       username: "Christina Aultman",
//       email: "christina@pacificpublicadjusters.com",
//     },
//   },
//   {
//     user: {
//       id: 75545185,
//       username: "Chris Castanuela",
//       email: "christopher@pacificpublicadjusters.com",
//     },
//   },
//   {
//     user: {
//       id: 75488393,
//       username: "Chelsea Piel",
//       email: "cpiel@pmzlaw.com",
//     },
//   },
//   {
//     user: {
//       id: 75487654,
//       username: "Dan Gordon",
//       email: "dancgordon94@gmail.com",
//     },
//   },
//   {
//     user: {
//       id: 75481452,
//       username: "Tom Glenn",
//       email: "tom@phaserservices.com",
//     },
//   },
//   {
//     user: {
//       id: 75481428,
//       username: "Mollie Babb",
//       email: "mollie.babb@phaserservices.com",
//     },
//   },
//   {
//     user: {
//       id: 75474107,
//       username: "Andrea Robles",
//       email: "andrea@pacificpa.claims",
//     },
//   },
//   {
//     user: {
//       id: 75472456,
//       username: "Andres Robles",
//       email: "andrew@pacificpa.claims",
//     },
//   },
//   {
//     user: {
//       id: 75467833,
//       username: "Sean Simmons",
//       email: "sean@deconspecialistswa.com",
//     },
//   },
//   {
//     user: {
//       id: 75457750,
//       username: "Henry Mwangi",
//       email: "henry@pacificpa.claims",
//     },
//   },
//   {
//     user: {
//       id: 90173870,
//       username: "JohnPaul",
//       email: "johnpaul@pacificpa.claims",
//     },
//   },
//   {
//     user: {
//       id: 75433424,
//       username: "Garrett Babb",
//       email: "garrett@pacificpa.claims",
//     },
//   },
//   {
//     user: {
//       id: 75432762,
//       username: "Jesse Froehling",
//       email: "jesse@bastion.law",
//     },
//   },
//   {
//     user: {
//       id: 75398758,
//       username: "Christopher Walsh",
//       email: "cwalsh@pmzlaw.com",
//     },
//   },
//   {
//     user: {
//       id: 75391153,
//       username: null,
//       email: "mpoli@pmzlaw.com",
//     },
//   },
//   {
//     user: {
//       id: 75380798,
//       username: "Robert D. Bohm",
//       email: "rdbohm@premisesinjurylaw.com",
//     },
//   },
//   {
//     user: {
//       id: 75380797,
//       username: "Jeff Zane",
//       email: "jzane@pmzlaw.com",
//     },
//   },
//   {
//     user: {
//       id: 75363521,
//       username: "Mark Stockwell",
//       email: "mark@pacificpa.claims",
//     },
//   },
//   {
//     user: {
//       id: 55775373,
//       username: "Andrea & Aidee",
//       email: "support@pacificpa.claims",
//     },
//   },
//   {
//     user: {
//       id: 61468486,
//       username: "Jean Ann Smith",
//       email: "jeanannsmith.pa@gmail.com",
//     },
//   },
//   {
//     user: {
//       id: 50510498,
//       username: "Amanda Collins",
//       email: "charterclaimsllc@gmail.com",
//     },
//   },
//   {
//     user: {
//       id: 50510480,
//       username: "Clint Wooley",
//       email: "clint@pacificpublicadjusters.com",
//     },
//   },
//   {
//     user: {
//       id: 55536219,
//       username: "Maria A Torres",
//       email: "maria@pacificpa.claims",
//     },
//   },
//   {
//     user: {
//       id: 30040805,
//       username: "Alexander Kuzh",
//       email: "oleksandr.kuzhel999@gmail.com",
//     },
//   },
//   {
//     user: {
//       id: 37683215,
//       username: "Taylor Babb",
//       email: "contact@pacificpa.claims",
//     },
//   },
// ];
