const express = require('express');
const mongoose = require('mongoose');
const  cors = require('cors')
const app = express()
const port = process.env.PORT || 3030;

app.use(cors())
app.use(require('body-parser').urlencoded({ extended: false }));

const reviews_data = require('./data/reviews.json');
const dealerships_data = require('./data/dealerships.json');


const Reviews = require('./review');

const Dealerships = require('./dealership');

// Seed only an empty collection: restarting the API must retain posted reviews.
async function start() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo_db:27017/dealershipsDB');
  if (await Reviews.countDocuments() === 0) await Reviews.insertMany(reviews_data.reviews);
  if (await Dealerships.countDocuments() === 0) await Dealerships.insertMany(dealerships_data.dealerships);
  app.listen(port, '0.0.0.0', () => console.log(`Server is running on port ${port}`));
}


// Express route to home
app.get('/', async (req, res) => {
    res.send("Welcome to the Mongoose API")
});

// Express route to fetch all reviews
app.get('/fetchReviews', async (req, res) => {
  try {
    const documents = await Reviews.find();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

// Express route to fetch reviews by a particular dealer
app.get('/fetchReviews/dealer/:id', async (req, res) => {
  try {
    const documents = await Reviews.find({dealership: req.params.id});
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

// Express route to fetch all dealerships
app.get('/fetchDealers', async (req, res) => {
  try {
    res.json(await Dealerships.find().sort({id: 1}));
  } catch (error) {
    res.status(500).json({error: 'Error fetching dealerships'});
  }
});

// Express route to fetch Dealers by a particular state
app.get('/fetchDealers/:state', async (req, res) => {
  try {
    res.json(await Dealerships.find({state: req.params.state}).sort({id: 1}));
  } catch (error) {
    res.status(500).json({error: 'Error fetching dealerships'});
  }
});

// Express route to fetch dealer by a particular id
app.get('/fetchDealer/:id', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({error: 'Invalid dealer ID'});
  try {
    const dealers = await Dealerships.find({id: Number(req.params.id)});
    if (!dealers.length) return res.status(404).json({error: 'Dealer not found'});
    res.json(dealers);
  } catch (error) {
    res.status(500).json({error: 'Error fetching dealership'});
  }
});

//Express route to insert review
app.post('/insert_review', express.json(), async (req, res) => {
  try {
  const data = req.body;
  if (!data || !Number.isInteger(data.dealership) || !data.review || typeof data.purchase !== 'boolean') {
    return res.status(400).json({error: 'Invalid review'});
  }
  if (!await Dealerships.exists({id: data.dealership})) return res.status(404).json({error: 'Dealer not found'});
  const documents = await Reviews.find().sort( { id: -1 } )
  let new_id = documents.length ? documents[0]['id']+1 : 1

  const review = new Reviews({
		"id": new_id,
		"name": data['name'],
		"dealership": data['dealership'],
		"review": data['review'],
		"purchase": data['purchase'],
		"purchase_date": data['purchase_date'],
		"car_make": data['car_make'],
		"car_model": data['car_model'],
		"car_year": data['car_year'],
	});

    const savedReview = await review.save();
    res.status(201).json(savedReview);
  } catch (error) {
		console.log(error);
    res.status(500).json({ error: 'Error inserting review' });
  }
});

// Start the Express server
if (require.main === module) start().catch(error => {console.error(error); process.exit(1);});
module.exports = app;
