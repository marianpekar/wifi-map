import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load Config
dotenv.config();

// Setup Express Framework
const app = express();

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'pug');

// Expose the Leaflet 'dist' directory
app.use('/leaflet', express.static(path.join(__dirname, 'node_modules', 'leaflet', 'dist')));

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
        res.render('index');
    } catch (error) {
        console.error("Failed to render index:", error);
        res.status(500).send("Server error");
    }
});

app.get('/networks', async (req, res) => {
    try {
        const { swLat, swLng, neLat, neLng } = req.query;

        const networks = await networksCol.aggregate([
            {
                $match: {
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
                }
            },
            {
                $project: {
                    _id: 1,
                    Bssid: 1,
                    Ssid: 1,
                    Frequency: 1,
                    Capabilities: 1
                }
            }
        ]).toArray();

        res.json(networks);

    } catch (error) {
        console.error("Error fetching networks:", error);
        res.status(500).send("Error retrieving networks data");
    }
});

app.get('/network/:id', async (req, res) => {
    try {
        const network = await networksCol.findOne({ _id: new ObjectId(req.params.id) });
        if (network) {
            res.json(network);
        } else {
            res.sendStatus(404).send("Network not found");
        }
    } catch {
        console.error("Error fetching network:", error);
        res.status(500).send("Error retrieving network data");
    }
});


// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
