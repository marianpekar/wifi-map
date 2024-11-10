import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load Config
dotenv.config();

// Setup Express Framework
const app = express();

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Expose the Leaflet 'dist' directory
app.use('/leaflet', express.static(path.join(__dirname, 'node_modules', 'leaflet', 'dist')));

app.set('view engine', 'pug');

// Setup MongoDB
const client = new MongoClient(process.env.MONGODB_URL);

client.connect().then(() => {
    console.log(`Connected to '${process.env.MONGODB_NAME}' database`);
}).catch(err => console.log(err));

const db = client.db(process.env.MONGODB_NAME);
const networksCol = db.collection('networks');

// Setup Routes
app.get('/', async (req, res) => {
    try {
        const networks = await networksCol.find().toArray();
        res.render('index', {networks});
    } catch (error) {
        console.error("Error fetching networks:", error);
        res.status(500).send("Error retrieving networks data");
    }
});

app.get('/networks', async (req, res) => {
    try {
        const { swLat, swLng, neLat, neLng } = req.query;
        const networks = await networksCol.find({
            "Levels": {
                "$elemMatch": {
                    "Latitude": {
                        "$gte": parseFloat(swLat),
                        "$lte": parseFloat(neLat)
                    },
                    "Longitude": {
                        "$gte": parseFloat(swLng),
                        "$lte": parseFloat(neLng)
                    }
                }
            }
        }).toArray();

        res.json(networks);
        
    } catch (error) {
        console.error("Error fetching networks:", error);
        res.status(500).send("Error retrieving networks data");
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
