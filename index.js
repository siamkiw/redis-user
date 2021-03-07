const express = require('express');
const redis = require('redis');
const clientMongo = require('mongodb').MongoClient;
const { uuid } = require('uuidv4');
const randomWords = require('random-words');

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.PORT || 6379;
const MONGO_PORT = process.env.PORT || 27017;
const MONGO_URL = `mongodb://localhost:${MONGO_PORT}`;

const clientRedis = redis.createClient(REDIS_PORT);

clientMongo.connect(MONGO_URL, function(err, client) {
	console.log('Connected successfully to server');

	const db = client.db('test');

	client.close();
});

const app = express();

function setResponse(id, data) {
	return `<h2>ID: ${id}</h2> <h2>Data: ${data}</h2>`;
}

async function createData(req, res, next) {
	try {
		console.log('Fetch Data...');
		const id = uuid();

		const data = randomWords({ exactly: 5, join: ' ' });

		// set to redis
		clientRedis.setex(id, 3600, data);

		res.send(setResponse(id, data));
	} catch (err) {
		console.error(err);
		res.status(500);
	}
}

async function getData(req, res, next) {
	try {
		console.log('Getting data..');

		let idObject = [];

		clientRedis.keys('*', async (err, data) => {
			for (let id of data) {
				idObject.push(await setDataToObject(id));
			}
			idObject = JSON.stringify(idObject);
			res.send(idObject);
		});
	} catch (err) {
		console.error(err);
		res.status(500);
	}
}

// put value in object
function setDataToObject(id) {
	return new Promise((resolve, reject) => {
		try {
			clientRedis.get(id, async (error, value) => {
				if (error) throw error;

				if (value !== null) {
					resolve({ id: id, value: value });
				}
			});
		} catch (error) {
			console.error(err);
			reject(error);
		}
	});
}

// cache middleware
function cache(req, res, next) {
	clientRedis.get(id, (err, data) => {
		if (err) throw err;

		if (data !== null) {
			res.send(setResponse(id, data));
		} else {
			next();
		}
	});
}

app.get('/createData', createData);

app.get('/getData', getData);

app.listen(PORT, () => {
	console.log(`App listening on port ${PORT}`);
});
